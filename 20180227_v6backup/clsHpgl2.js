/*
 * clsHpgl2
 *
 * 2016 (c) y.ikeda
 */

// console.*の出力設定
const clsHpgl2DebugSetting = 1;		// [0:all
									//  1:error+warn+log
									//  2:error+warn
									//  3:error
									//  >3:(none)]
// デフォルトのペン幅
const defaultPenWidths = [0.35, 0.1875, 0.35, 0.5625, 0.75];

function clsHpgl2( fileName, pStrFile, pCanvasObj ){
	// ファイル名
	this.fileName = fileName;

	// Canvasオブジェクト
	this.canvas = (pCanvasObj === undefined) ? null : pCanvasObj;
	
	// strFileを分析してinstructionsの配列にする
	this.hpgl2 = new Array();
	{
		// -----------------
		// 内部関数 getToken
		// hpgl2の文字列から、先頭のコマンドのみを読んで、
		// ハッシュに包んで返す
		// -----------------
		var REG_HPGL2_INSTRUCTION = new RegExp('([A-Z]{2})([^A-Z;]*);?', 'i');
				// ↑あやしい [A-Z]{2}[\-\.0-9,]*;?かなぁ
		var getToken = function(tokenStr)
		{
			var aryRet = tokenStr.match( REG_HPGL2_INSTRUCTION );
			if( aryRet == null ){ return null; }
			
			// Mnemonic(先頭の２文字)
			var mne = aryRet[1];
			// Parameters(後続の文字列.カンマ区切り)
			var strParams = aryRet[2];
			var params = null;
			if( strParams.length > 0 ){
				params = strParams.split(",");
			} else {
				// parameterがなくても、
				// 後で配列として扱うために空の配列を作っておく
				params = new Array();
			}
			
			// １コマンドの文字列長
			var len = mne.length + strParams.length;
			
			return {"Mnemonic":mne, "Parameters":params, "len":len};
		}
		
		// 読んでいる文字列（読み終わった分は削除していく）
		var strCur = pStrFile;
		
		// 開始モードのcheck
		// 1バイト目が0x1B(ESC)になっていること
		var initChr = strCur.charCodeAt(0);
		if( initChr != 0x1B ){
			if( clsHpgl2DebugSetting <= 3 ){
				console.error("HPGL2のファイルではないようです。(1バイト目が0x1Bでない)");
			}
			this.fileName = "";
			return;
		}
		strCur = strCur.slice(1);
		
		// 2～5バイト目が、%-1Bのものだけが処理対象
		//	%の後ろの数値
		//	-1	Context switch from HP RTL to "stand-alone plotter".
		//	0	The HP-GL/2 pen position is set to the previous HP-GL/2 pen position.
		//	1	The HP-GL/2 pen position is set to the current HP RTL CAP.
		var initStr = strCur.substr(0,4);
		if( initStr != "%-1B" ){
			if( clsHpgl2DebugSetting <= 3 ){
				console.error("HPGL2のファイルではないようです。(2バイト目以降のモードが-1Bでない)");
			}
			this.fileName = "";
			return;
		}
		strCur = strCur.slice(4);
		
		// 「アルファベット２文字～次のアルファベットの手前」を１トークンとして
		// トークンに切り出し、解釈する
		var token = {};
		while( token != null ){
			token = getToken(strCur);
			if( token != null ){
				strCur = strCur.slice( token.len );
				
				// メンバ変数へ格納
				this.hpgl2.push( token );
			}
		}
	}
	
	// 描画中のステータス
	// NP(Number of Pens)のような設定系の情報もすべてこのハッシュへ追加格納する
	this.drawStatus = {
		PenDown : false,	// PenDownは本来PD.PenDownだが、PDとPUの共有変数のため、PDまたはPUとせず、drawStatus.PenDownとする
		CurPos : [0.0, 0.0],
		PenWidth : [defaultPenWidths[0]]	// PWとSPの共有変数のため、ここで定義
	};
	// 描画処理(表示系のinstructionのみ実行)
	this.draw = function( matrix, canvasName )
	{
//matrixlib.show(matrix);
		var ctx = $("#"+canvasName)[0].getContext("2d");
		
//console.log("要素数:"+this.hpgl2.length);
		for( var i=0; i<this.hpgl2.length; i++ ){
			// draw系のinstructionのみ実行
			if( this.hpgl2[i].Mnemonic in Instructions.drawings ){
				this.executeOne( this.hpgl2[i], ctx, matrix );
			}
		}
	}
	// 設定のinstructionのみ実行
	this.configulate = function( matrix )
	{
		for( var i=0; i<this.hpgl2.length; i++ ){
			if( this.hpgl2[i].Mnemonic in Instructions.settings ){
				this.executeOne( this.hpgl2[i], matrix );
			}
		}
	}
	
	this.executeOne = function( objOneHpgl2, ctx, matrix ){
		var mne = objOneHpgl2.Mnemonic;
		var params = objOneHpgl2.Parameters;
//console.log("mne:"+mne);
		
/* みんなお行儀がいいという前提で、高速化のため、コメントアウト
		// auto-pendownのコマンドの場合は、
		// drawStatus.penDownを強制的にtrueにする
		// ただし、実行後に元に戻すため、実行前の状態を覚えておいて終了後に戻す
		var prevPenDownStatus = this.drawStatus.penDown;
		var autoPenDown = false;
		if( mne in AutoPDCommandList ){
			autoPenDown = true;
			this.drawStatus.penDown = true;
		}
*/
		
		// --- 解釈 ---
		var retObj = Hpgl2Format[mne](this.drawStatus.CurPos, params);
//console.log("["+mne+"]");
//console.log(this.drawStatus.CurPos);
//console.log(retObj);
		
		// --- 処理 ---
		// settingsがある場合は、this.drawStatusへ追加 or 上書きする
		if( 'settings' in retObj ){
			if( (mne == "PU") || (mne == "PD") ){
				// 共有変数の操作の場合は、[mne]ではなく、drawStatus直下の変数を更新する
				this.drawStatus.PenDown = retObj.settings["PenDown"];
			}else if( mne == "PW" ){
				// PW(PenWidth)の場合は、関数を呼び出すことによって、その中でdrawStatus直下の変数へ入れる
				this.setPenWidth( retObj.settings );
			}else{
				var objSettings = {};
				for( var key in retObj.settings ){
					objSettings[key] = retObj.settings[key];
				}
				this.drawStatus[mne] = objSettings;
			}
		}
		// pointsがある場合
		// PenDownの場合は、描画してペンの位置を移動する
		// PenUpの場合は、ペンの位置を移動するだけ
		if( 'points' in retObj ){
			// 描画
			if( this.drawStatus.PenDown && this.canvas ){
				this.canvas.drawPolyLine(
					this.drawStatus.CurPos,
					retObj.points,
					matrix,
					this.getLineWidth()
				);
			}
			
			// 最終の点へペンを移動
			this.drawStatus.CurPos[0] = retObj.points[retObj.points.length-1][0];
			this.drawStatus.CurPos[1] = retObj.points[retObj.points.length-1][1];
		}

/*
		// auto-pendownを戻す
		if( autoPenDown ){
			this.drawStatus.penDown = prevPenDownStatus;
		}
*/
	};
	
	// AutoScale時のスケール値を返す
	this.getAutoScale = function( canvasName )
	{
		var logout_getAutoScale = false;
		var canvasWidth = $("#"+canvasName).width();
		var canvasHeight = $("#"+canvasName).height();
		
/*
		// PSがない場合、またPSにwidth、lengthがない場合は
		// 計算できないので、1を返す
		if( !("PS" in this.drawStatus) ) return 1;
		if( !("width" in this.drawStatus["PS"]) ) return 1;
		if( !("length" in this.drawStatus["PS"]) ) return 1;
*/
		
		// わけがわからなくなるけど、90度回っている関係で
		// データの縦横は
		// PS.widthを縦、PS.lengthを横と読む
//		var dataHeight = this.drawStatus["PS"]["width"];
//		var dataWidth = this.drawStatus["PS"]["length"];
		var dataHeight = this.getWidth();
		var dataWidth = this.getHeight();
		
if( logout_getAutoScale ){
console.log("clsHpgl2.getAutoScale:[logout ON]");
console.log("dataHeight:"+dataHeight);
console.log("dataWidth:"+dataWidth);
console.log("canvasHeight:"+canvasHeight);
console.log("canvasWidth:"+canvasWidth);
}
		
		// データの縦/横比
		var drate = dataHeight / dataWidth;
		// canvasの縦/横比
		var crate = canvasHeight / canvasWidth;
		
		var retScale = 1;
		var tateMax = true;	// [ true:縦が最大 | false:横が最大 ]
		if( (drate>1) && (crate<1) ){
			// ①データ:縦長, canvas:横長
			retScale = canvasHeight / dataHeight;
			tateMax = true;
if( logout_getAutoScale ){
console.log("一致パターン:1.データ:縦長, canvas:横長");
}
		}else if( (drate<1) && (crate>1) ){
			// ②データ:横長, canvas:縦長
			retScale = canvasWidth / dataWidth;
			tateMax = false;
if( logout_getAutoScale ){
console.log("一致パターン:2.データ:横長, canvas:縦長");
}
		}else if( crate < drate ){
			// ③canvasの縦横比 < データの縦横比
			retScale = canvasHeight / dataHeight;
			tateMax = true;
if( logout_getAutoScale ){
console.log("一致パターン:3.canvasの縦横比 < データの縦横比");
}
		}else{
			// ④データの縦横比 < canvasの縦横比
if( logout_getAutoScale ){
console.log("" + magBase + "/" +  canvasWidth +"/"+ dataWidth);
}
			retScale = canvasWidth / dataWidth;
			tateMax = false;
if( logout_getAutoScale ){
console.log("一致パターン:4.データの縦横比 < canvasの縦横比");
}
		}
		
if( logout_getAutoScale ){
console.log("return:"+retScale);
}
		return retScale;
	};

	this.getWidth = function(){
		if( !("PS" in this.drawStatus) ) return 1;
		if( !("width" in this.drawStatus["PS"]) ) return 1;

		return this.drawStatus["PS"]["width"];		
	};
	this.getHeight = function(){
		if( !("PS" in this.drawStatus) ) return 1;
		if( !("length" in this.drawStatus["PS"]) ) return 1;

		return this.drawStatus["PS"]["length"];		
	};
	
	// 線幅を登録する
	this.setPenWidth = function(objSettings)
	{
		// 引数の情報
		var penWidth = ("PenWidth" in objSettings) ? objSettings.PenWidth : defaultPenWidths[0];
		var penNumber = ("PenNumber" in objSettings) ? objSettings.PenNumber : 0;
		
		// penNumberよりthis.drawStatus.PenWidth配列が短い場合は、
		// 指示のあったペン番号の幅を登録するための要素を追加する。
		// indexをペン番号とするため、例えばペン番号が３の場合、配列要素は４つ必要。
		if( this.drawStatus.PenWidth.length <= penNumber ){
			var orgLen = this.drawStatus.PenWidth;
			for( var i=0; i<(penNumber - orgLen + 1); i++ ){
				this.drawStatus.PenWidth.push(defaultPenWidths[(i<defaultPenWidths.length)?i:0]);
			}
		}

		// 配列要素はあるはずなので、設定値を入れる
		this.drawStatus.PenWidth[penNumber] = penWidth;
	};
	// 線幅を返す
	this.getLineWidth = function(pPenNumber){
		var penNumber = 0;
		if( !pPenNumber ){
			// 指示がない場合は、最後にSelectPenされたペン番号
			if( "SP" in this.drawStatus ){
				if( "PenNumber" in this.drawStatus.SP ){
					penNumber = this.drawStatus.SP.PenNumber;
				}
			}
		}

		// 指示されたペン番号が登録されていれば返す
		// 未登録（番号が大きすぎるペン番号）の場合は、適当な初期値を返す
		var ret = defaultPenWidths[0];
		if( penNumber < this.drawStatus.PenWidth.length ){
			// PWで設定した場合
			ret = this.drawStatus.PenWidth[penNumber];
		}else{
			// PWで設定されていない場合
			if( penNumber < defaultPenWidths.length ){
				// デフォルトのPenWidthがあるうちはそれを返す
				ret = defaultPenWidths[penNumber];
			}else{
				// defaultPenWidthsで準備した番号すら使えないpenNumberが指示された
				ret = defaultPenWidths[0];
			}
		}
		return ret;
	};
}
