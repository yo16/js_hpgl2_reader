/*
 * clsCanvas
 *
 * 2016 (c) y.ikeda
 */

function clsCanvas( pCanvasName )
{
	// 自分自身を、DOMに登録（参照渡し）
	$.data( $("#"+pCanvasName).get(0), "objCanvas", this);
	
	// canvasの名前
	this.canvasName = pCanvasName;
	
	// canvasに登録済みのhpgl2オブジェクト
	this.hpgl2Objects = new Array();
	
	// canvasに登録済みのImageオブジェクト
	this.imageObjects = new Array();
	
	// clientRectの配置位置（左上）を記憶しておく
	this.clientRect = {
		left : $("#"+this.canvasName)[0].getBoundingClientRect().left,
		top  : $("#"+this.canvasName)[0].getBoundingClientRect().top
	};
	
	// 表示系の情報
	this.mouseEvent = new clsMouseEventInfo(this);
	
	// HPGL2の表示マトリックス
	this.mtxHpgl2 = [[1,0,0],[0,1,0],[0,0,1]];
	// Imageの表示マトリックス
	this.mtxImage = [[1,0,0],[0,1,0],[0,0,1]];
	
	// 次回再描画時にAutoScaleを実施するフラグ
	this.doAutoScale = true;
	
	// マウス操作中に絵を描くかどうかの設定（PG内では変更しないstatic値）
	this.drawMouseMark = true;
	
	// matrixを初期化
	// 左上の原点を左下へ移動する
	// メモ:本当の初期と、AutoScaleのときに使用したいので関数化した。
	this.initializeMatrix = function(){
		// HPGL2の表示マトリックスの初期値
		this.mtxHpgl2 = [[1,0,0],[0,1,0],[0,0,1]];
		// 上下反転
		this.mtxHpgl2 = matrixlib.reverse(this.mtxHpgl2, true);
		// canvasのY軸方向へcanvasの高さ分移動
		this.mtxHpgl2 = matrixlib.move(this.mtxHpgl2, [0,($("#"+this.canvasName).height())]);

		// Imageの表示マトリックスの初期値
		this.mtxImage = [[1,0,0],[0,1,0],[0,0,1]];
	};
	
	// canvasの初期設定
	// メモ：本当の初期と、Plot精度変更時にmatrxiを変更するため、関数化した。
	this.initializeCanvas = function(){
		// Canvasの左上の位置を再定義
		// Canvasのサイズには依存しないが、他のエレメントの影響で位置が変わることがあるため、設定する
		this.clientRect = {
			left : $("#"+this.canvasName)[0].getBoundingClientRect().left,
			top  : $("#"+this.canvasName)[0].getBoundingClientRect().top
		};

		var ctx = $("#"+this.canvasName)[0].getContext("2d");
		
		// cssで設定したはずのheightとwidthがうまく設定されないのでここで明示的に反映する
		// 注意：htmlで、javascriptよりcssを先に読み込ませること。
		ctx.canvas.height = $("#"+this.canvasName).height();
		ctx.canvas.width = $("#"+this.canvasName).width();
		
		// 折れ線の角の描画方法
//		ctx.lineJoin = "bevel";	// 紙を折るような感じ
//		ctx.lineJoin = "round";	// Rが"線太さ/2"弱くらいのフィレット線
		ctx.lineJoin = "miter";	// 線幅の外側同士を延長して交点を求める
		ctx.miterLimit = 2.0;	// 交点が遠すぎるときにbavelのように切る
		ctx.lineCap = "square";	// 終端座標の先をどうするか。squareは終端点に線幅の正方形を描く。
		
		// canvasに出る、デフォルトのコンテキストメニューを停止
		$("#" + this.canvasName).bind("contextmenu", function(e){
			e.preventDefault();
		});
		
		// matrixを初期化
		this.initializeMatrix();
	};
	this.initializeCanvas();
	
	// canvasへファイルを追加する
	this.addFile = function( fileInfo, strFile ){
		var objHpgl2 = new clsHpgl2( fileInfo, strFile, this );
		if( objHpgl2.hpgl2.length == 0 ){
			// 正常に読み込めなかった
			return;
		}
		
		// (描画はせず)設定だけ実行
		objHpgl2.configulate( this.mtxHpgl2 );
		
		this.hpgl2Objects.push( objHpgl2 );
		// 読み込んだinstruction数
		// console.log("file:" + fileInfo.name);
		// console.log("inst:" + objHpgl2.hpgl2.length);
	};
	
	// 再描画
	// matrixを指示した場合は、そのmatrixで描画する
	// ない場合は、自身で保持しているmatrixで描画する
	this.redraw = function( pHpgl2Matrix ,pImageMatrix ){
		// 描画用の行列を決定する
		var localMtxHpgl2 = pHpgl2Matrix || this.mtxHpgl2;
		var localMtxImage = pImageMatrix || this.mtxImage; 
		
		// canvasを初期化
		{
			var ctx = $("#"+this.canvasName)[0].getContext("2d");
			var w = ctx.canvas.width;
			var h = ctx.canvas.height;
			ctx.clearRect(0,0, w, h);
			ctx.fillStyle = "rgb(255,255,255)";
			ctx.fillRect(0,0, w, h);
		}
		
		// hpgl2を描画
console.time("clsCanvas.redrawHpgl2("+this.canvasName+")");
		for( var i=0; i<this.hpgl2Objects.length; i++ ){
			// オートスケール
			if( this.doAutoScale ){
console.log("auto scale!");
				// matrixをもう一度作り直す
				this.initializeMatrix();

				// 拡縮率を取得して反映
				var exp = this.hpgl2Objects[0].getAutoScale(this.canvasName)
				// 最初のhpglオブジェクトだけを相手にする
				this.mtxHpgl2 = matrixlib.expandWithCenter(
					this.mtxHpgl2,
					exp,
					[0,h]
				);

				// オートスケールの場合は、mtxを更新しちゃう
				localMtxHpgl2 = this.mtxHpgl2;
				
				this.doAutoScale = false;
			}
			// 描画指示
			this.hpgl2Objects[i].draw( localMtxHpgl2, this.canvasName );
		}
console.timeEnd("clsCanvas.redrawHpgl2("+this.canvasName+")");
		
		// imageを描画
console.time("clsCanvas.redrawImage("+this.canvasName+")");
		for( var i=0; i<this.imageObjects.length; i++ ){
			this.imageObjects[i].draw( localMtxImage, this.canvasName );
		}
console.timeEnd("clsCanvas.redrawImage("+this.canvasName+")");
	};
	
	// 別のCanvasの情報からImageObjectを作って、このCanvasへ画像を追加する
	this.addImageFrom = function( canvasName ){
		// 配列へImageオブジェクトを追加する
		this.imageObjects.push( new clsImage(canvasName) );
	};

/*	// 画像オブジェクトを破棄
	this.destructImageObj = function(){
		this.imageObjects = new Array();
	};
*/
	// 画像オブジェクトを再作成
	this.remakeImageObj = function(){
		this.imageObjects.forEach(function(objImg){
			objImg.setImage();
		});
	};
	
/* 使われていないのでコメントアウト。
たぶんいらない。
不要と確定したら消す。2/6
	// imageオブジェクトを作って返す
	this.getImage = function(){
		return new clsImage( this.canvasName );
	};
*/
	
	// ポリラインを描画する
	// beginPathとstrokeを何度も発行するのが嫌なので
	// 始点と通過点を渡してポリラインとして描画することにした。
	this.drawPolyLine = function( pntInit, points, matrix, lineWidth ){
		var can = document.getElementById(this.canvasName);
		if( can.getContext ){
			var ctx = can.getContext("2d");
			
			// 線幅を決定する
			// ※ここの数字は適当。
			//		(1) useLineWidthに掛ける数字は、大きくすると線種の違いが大きく出るが、あまりに大きくすると太すぎる。
			//			小さくすると、違いがわからなくなる。30くらいが適当か？
			//			Canvasのサイズ、PSの値には無関係。
			//		(2) 細い場合に同じ値にそろえる数字は、大きくすると線種の違いがわからなくなる。
			//			小さくすると、細い線から順に見えなくなる。0.1くらいが適当か？
			// 本当の線幅だと違いがわからないので、掛け算して差を大きくする。
			var useLineWidth = lineWidth * matrix[0][0] * 50;
//console.log(ctx.canvas.width);
//console.log(ctx.canvas.height);
			if( useLineWidth < 0.1 ){
				// 細い場合は切り上げる
				useLineWidth = 0.1;
			}

			// matrixを反映
			this.applyMatrixToPoint(pntInit, matrix);
			this.applyMatrixToPoints(points, matrix);
			
			ctx.strokeStyle = "rgb(0,0,0)";		// getContextのたびに設定しないといけない
			ctx.lineWidth = useLineWidth;
			
			ctx.beginPath();
			ctx.moveTo(pntInit[0], pntInit[1]);
			for( var i=0; i<points.length; i++ ){
				ctx.lineTo(points[i][0], points[i][1]);
			}
			ctx.stroke();
		}
	};
	
	// 点情報{x:nnn, y:nnn}のobjectにmatrixを反映させる(参照渡し)
	this.applyMatrixToPoint = function( point, matrix ){
		var ret = matrixlib.apply3x1(matrix, point);
		point[0] = ret[0];
		point[1] = ret[1];
	};
	// 点群を渡す版.
	this.applyMatrixToPoints = function( points, matrix ){
		for( var i=0; i<points.length; i++ ){
			this.applyMatrixToPoint(points[i], matrix);
		}
	};

	// Hpgl2オブジェクトとImageオブジェクトの全部で、最大の高さを返す
	this.getMaxHeight = function(imgSizeFromSource /* =true */){
		var maxHeight = 0;
		this.hpgl2Objects.forEach(function(obj){
			var objHeight = obj.getHeight();
			if( maxHeight < objHeight ){
				maxHeight = objHeight;
			}
		});
		// 引数がtrueの場合は、ソースのheightを使う
		var fromSource = imgSizeFromSource || true;
		if( fromSource ){
			this.imageObjects.forEach(function(objImg){
				var objHeight = $("#"+objImg.sourceCanvasName).height();
				if( maxHeight < objHeight ){
					maxHeight = objHeight;
				}
			});
		}else{
			this.imageObjects.forEach(function(obj){
				var objHeight = obj.img.height;
				if( maxHeight < objHeight ){
					maxHeight = objHeight;
				}
			});
		}
		return maxHeight;
	};
	// Hpgl2オブジェクトとImageオブジェクトの全部で、最大の幅を返す
	this.getMaxWidth = function(imgSizeFromSource /* =true */){
		var maxWidth = 0;
		this.hpgl2Objects.forEach(function(obj){
			var objWidth = obj.getWidth();
			if( maxWidth < objWidth ){
				maxWidth = objWidth;
			}
		});
		// 引数がtrueの場合は、ソースのwidthを使う
		var fromSource = imgSizeFromSource || true;
		if( fromSource ){
			this.imageObjects.forEach(function(objImg){
				var objWidth = $("#"+objImg.sourceCanvasName).width();
				if( maxWidth < objWidth ){
					maxWidth = objWidth
				}
			});
		}else{
			this.imageObjects.forEach(function(obj){
				var objWidth = obj.img.width;
				if( maxWidth < objWidth ){
					maxWidth = objWidth
				}
			});
		}
		return maxWidth;
	};

}

/*

function getCanvasPos( vec, mtx0 )
{
	return {
		x : mtx0[0][0]*vec.x + mtx0[0][1]*vec.y + mtx0[0][2],
		y : mtx0[1][0]*vec.x + mtx0[1][1]*vec.y + mtx0[1][2]
	};
}
*/