/*
 * clsHpgl2
 *
 * 2018 (c) yo16
 */

function clsHpgl2( pFileInfo, pStrFile ){
	// ファイル名
	this.fileName = pFileInfo.name;
	
	// strFileを分析してinstructionsの配列にする
	this.hpgl2 = new Array();
	{
		// -----------------
		// 内部関数 getToken
		// hpgl2の文字列から、先頭のコマンドのみを読んで、
		// ハッシュに包んで返す
		// -----------------
		var REG_HPGL2_INSTRUCTION = new RegExp('([A-Z]{2})([^A-Z;]*);?', 'i');
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
			
			// hpgl2FormatのInstructionsに登録されているグループ
			var InsSettings = (mne in Instructions.settings);
			var InsDrawings = (mne in Instructions.drawings);
			
			// 高速化因子
			var speedupElm = getSpeedupElement(mne, params);
			
			return {"Mnemonic":mne, "Parameters":params, "len":len, 
				"IsSettingInstruction" : InsSettings, "IsDrawingInstruction" : InsDrawings,
				"SpeedupElement":speedupElm};
		}
		
		// 読んでいる文字列（読み終わった分は削除していく）
		var strCur = pStrFile;
		
		// 開始モードのcheck
		// 1バイト目が0x1B(ESC)になっていること
		var initChr = strCur.charCodeAt(0);
		if( initChr != 0x1B ){
			alert("HPGL2のファイルではないようです。\n(1バイト目が0x1Bでない)");
			console.log("HPGL2のファイルではないようです。\n(1バイト目が0x1Bでない)");
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
			alert("HPGL2のファイルではないようです。\n(モードが-1Bでない)");
			console.log("HPGL2のファイルではないようです。\n(モードが-1Bでない)");
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
	// NP(Number of Pens)のような情報もすべてこのハッシュへ格納する
	this.drawStatus = {
		penDown : false,
		curPos : {x:0.0, y:0.0}
	};
	this.penDown = false;
	// 描画処理(表示のinstructionのみ実行)
	this.draw = function( matrix, canvasName )
	{
		var ctx = $("#"+canvasName)[0].getContext("2d");
		
//console.log("要素数:"+this.hpgl2.length);
		for( var i=0; i<this.hpgl2.length; i++ ){
			// draw系のinstructionのみ実行
			if( this.hpgl2[i].IsDrawingInstruction ){
				this.executeOne( this.hpgl2[i], ctx, matrix );
			}
		}
	}
	// 設定のinstructionのみ実行
	this.configulate = function( matrix )
	{
		for( var i=0; i<this.hpgl2.length; i++ ){
			if( this.hpgl2[i].IsSettingsInstruction ){
				this.executeOne( this.hpgl2[i], matrix );
			}
		}
	}
	
	// instrutionを実行
	this.executeOne = function( objHpgl2, ctx, matrix ){
		var mne = objHpgl2.Mnemonic;
		var params = objHpgl2.Parameters;
		var spup = objHpgl2.SpeedupElement;
//console.log("mne:"+mne);
		
/* 基本的にないはずなので、高速化のため、コメントアウト
		// 未定義のmnemonicの場合は抜ける
		if( !(mne in Hpgl2Format) ){
			console.log("unknown instruction!:"+mne);
			return;
		}
*/
		
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
		
		// 実行
		Hpgl2Format[mne](params, ctx, this.drawStatus, matrix, spup);
		
/*
		// auto-pendownを戻す
		if( autoPenDown ){
			this.drawStatus.penDown = prevPenDownStatus;
		}
*/
	}
	
	// AutoScale時のスケール値を返す
	this.getAutoScale = function( canvasName )
	{
		var logout_getAutoScale = false;
		var canvasWidth = $("#"+canvasName).width();
		var canvasHeight = $("#"+canvasName).height();
		
		// PSがない場合、またPSにwidth、lengthがない場合は
		// 計算できないので、1を返す
		if( !("PS" in this.drawStatus) ) return 1;
		if( !("width" in this.drawStatus["PS"]) ) return 1;
		if( !("length" in this.drawStatus["PS"]) ) return 1;
		
		
		// わけがわからなくなるけど、90度回っている関係で
		// データの縦横は
		// PS.widthを縦、PS.lengthを横と読む
		var dataHeight = this.drawStatus["PS"]["width"];
		var dataWidth = this.drawStatus["PS"]["length"];
		
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
	}
}
