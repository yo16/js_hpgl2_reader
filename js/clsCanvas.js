/*
 * clsCanvas
 *
 * 2018 (c) yo16
 */

function clsCanvas( pCanvasName )
{
	// canvasの名前
	this.canvasName = pCanvasName;
	
	// canvasに登録済みのhpgl2オブジェクト
	this.hpgl2Objects = new Array();
	
	// clientRectを記憶しておく
	this.clientRect = {
		left : $("#"+this.canvasName)[0].getBoundingClientRect().left,
		top  : $("#"+this.canvasName)[0].getBoundingClientRect().top
	};
	
	// 表示系の情報
	// 拡大縮小率
	this.expandRate = 1.0;
	// 原点位置(拡大/縮小時に使用)
	this.originPos = {x:0.0, y:0.0};
	
	// 次回再描画時にAutoScaleを実施するフラグ
	this.doAutoScale = true;
	
	// マウス操作中に絵を描くかどうか
	this.drawMouseMark = true;
	
	
	
	// canvasの初期設定
	{
		var ctx = $("#"+this.canvasName)[0].getContext("2d");
		
		// cssで設定したはずのheightとwidthがうまく設定されないのでここで明示的に反映する
		// 注意:htmlでcssを先に読み込ませること。
		ctx.canvas.height = $("#"+this.canvasName).height();
		ctx.canvas.width = $("#"+this.canvasName).width();
		
		// 折れ線の角の描画方法
//		ctx.lineJoin = "bevel";	// 紙を折るような感じ
		ctx.lineJoin = "round";	// Rが"線太さ/2"弱くらいのフィレット線
		
		// デフォルトのコンテキストメニューを停止
		$("#" + this.canvasName).bind("contextmenu", function(e){
			e.preventDefault();
		});
	}
	
	// canvasへファイルを追加する
	this.addFile = function( fileInfo, strFile ){
		var objHpgl2 = new clsHpgl2( fileInfo, strFile );
		if( objHpgl2.hpgl2.length == 0 ){
			// 正常に読み込めなかった
			return;
		}
		
		// (描画はせず)設定だけ実行
		objHpgl2.configulate( this.getCurrentMatrix() );
		
		this.hpgl2Objects.push( objHpgl2 );
		// 読み込んだinstruction数
		// console.log("file:" + fileInfo.name);
		// console.log("inst:" + objHpgl2.hpgl2.length);
		
	};
	
	// 再描画
	// matrixを指示した場合は、そのmatrixで描画する
	// ない場合は、自身で保持しているmatrixで描画する
	this.redraw = function( pMatrix ){
//console.time("clsCanvas.redraw");
		// 描画用の行列を決定する
		var mtx = pMatrix || this.getCurrentMatrix();
		
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
		for( var i=0; i<this.hpgl2Objects.length; i++ ){
			// 初めてのhpgl2の場合は、拡大縮小率を調整する
			if( this.doAutoScale ){
				// 拡縮率を取得して、設定
				this.expandRate = this.hpgl2Objects[0].getAutoScale(this.canvasName);
				// 原点位置を左下へ移動
				this.originPos.x = 0;
				this.originPos.y = 0;
//console.log(mtx);
				// expandRateとoriginPosを更新したので、もう一度currentMatrixを計算する
				mtx = this.getCurrentMatrix();
//console.log("変更後のexpandRate:"+this.expandRate);
//console.log(mtx);
				
				this.doAutoScale = false;
			}
			this.hpgl2Objects[i].draw( mtx, this.canvasName );
		}
//console.timeEnd("clsCanvas.redraw");
		
	};
	
	// デフォルトのmatrixを返す
	// matrixの定義
	// |a b c|
	// |d e f|
	// |g h i|
	// a = mtx[0][0]
	// b = mtx[0][1]
	// c = mtx[0][2]
	// d = mtx[1][0]
	// e = mtx[1][1]
	// f = mtx[1][2]
	// g = mtx[2][0]
	// h = mtx[2][1]
	// i = mtx[2][2]
	this.getCurrentMatrix = function(){
		var mtx = [[1,0,0],[0,1,0],[0,0,1]];
		
		// yを反転
		matrixlib.expand(mtx, [1,-1]);
		
		// 拡大
		matrixlib.expand(mtx, this.expandRate);
		
		// canvas.height分、y軸＋方向へ移動
		matrixlib.move(mtx, [0, $("#"+this.canvasName).height()]);
		
		// 平行移動
		matrixlib.move(mtx, [this.originPos.x, this.originPos.y]);
		
		return mtx;
	};
	
	
	
	// マウス操作関連
	this.mouseStatus = {
		// マウスダウンの位置
		mouseDownPos : {x:0.0, y:0.0},
		
		// マウスダウン時のexpandRate
		mouseDownExpandRate : 1.0,
		
		// マウスダウン時の原点
		mouseDownOriginPos : {x:0.0, y:0.0},
		
		// scaling中のexpandRate
		scalingExpandRate : 1.0,
		// scaling中の移動量
		scalingDistance : [0,0],
		
		dragging : false,
		scaling : false
	};
	
	// mousedown
	$("#"+this.canvasName).mousedown(function(e, cx, cy, btn){
//console.log("mousedown!");
		var objCanvas = $("#"+$(this).attr("id"))[0].getCanvasObject();
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy;
		var button = (btn === undefined) ? e.button : btn;
		
		var curPos = {
			x : clientX - objCanvas.clientRect.left,
			y : clientY - objCanvas.clientRect.top
		};
		
		if( (button == 0) || (button==2) ){
			// mousedown時の情報を記憶
			// downPos
			objCanvas.mouseStatus.mouseDownPos.x = curPos.x;
			objCanvas.mouseStatus.mouseDownPos.y = curPos.y;
			// down時の原点
			objCanvas.mouseStatus.mouseDownOriginPos.x = objCanvas.originPos.x;
			objCanvas.mouseStatus.mouseDownOriginPos.y = objCanvas.originPos.y;
//			objCanvas.mouseStatus.mouseDownExpandRate = objCanvas.expandRate;
			
			if( button == 0 ){			// 左クリック
				// 平行移動を開始
				objCanvas.mouseStatus.dragging = true;
			}else if( button == 2 ){		// 右クリック
				// スケーリングを開始
				objCanvas.mouseStatus.scaling = true;
			}
		}else if( button == 1 ){
/*
中クリックは、AutoScaleか、中心移動のどちらかがいいような気がするけど、
決め手がないので、変な動きにならないようにコメントアウトしておく。
			// 中クリック時AutoScale
			objCanvas.doAutoScale = true;
			objCanvas.redraw();
*/
		}
	});
	
	// mouseup
	$("#"+this.canvasName).mouseup(function(e, cx, cy){
//console.log("mouseup!");
		var objCanvas = $("#"+$(this).attr("id"))[0].getCanvasObject();
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy;
		
		// 現在の原点位置で、matrixの値を更新
		var curPos = {
			x : clientX - objCanvas.clientRect.left,
			y : clientY - objCanvas.clientRect.top
		};
		
		// draggingかscalingのときは、位置を更新する
		if( objCanvas.mouseStatus.dragging ){
			// dragging
			objCanvas.originPos.x += curPos.x - objCanvas.mouseStatus.mouseDownPos.x;
			objCanvas.originPos.y += curPos.y - objCanvas.mouseStatus.mouseDownPos.y;
			
		}else if( objCanvas.mouseStatus.scaling ){
			// scaling
			objCanvas.expandRate *= objCanvas.mouseStatus.scalingExpandRate;
			objCanvas.originPos.x += objCanvas.mouseStatus.scalingDistance[0];
			objCanvas.originPos.y += objCanvas.mouseStatus.scalingDistance[1];
			
		}
		if( objCanvas.mouseStatus.dragging || objCanvas.mouseStatus.scaling ){
			objCanvas.redraw();
		}
		
		objCanvas.mouseStatus.dragging = false;
		objCanvas.mouseStatus.scaling = false;
	});
	
	// mousemove
	$("#"+this.canvasName).mousemove(function(e, cx, cy){
//console.log("mousemove!");
		var objCanvas = $("#"+$(this).attr("id"))[0].getCanvasObject();
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy;
		
		// ドラッグ中でも拡大縮小中でもない場合は、何もしない
		if( !(objCanvas.mouseStatus.dragging || objCanvas.mouseStatus.scaling) ){
			return;
		}
		
		var curPos = {
			x : clientX - objCanvas.clientRect.left,
			y : clientY - objCanvas.clientRect.top
		};
		
		if( objCanvas.mouseStatus.dragging ){
			// mousedownの位置から現在の位置まで移動したmatrixを使用して、
			// redrawする
			var vec = [
				curPos.x - objCanvas.mouseStatus.mouseDownPos.x,
				curPos.y - objCanvas.mouseStatus.mouseDownPos.y
			];
			var mtx = objCanvas.getCurrentMatrix();
//matrixlib.show(mtx);
			matrixlib.move( mtx, vec );
//matrixlib.show(mtx);
			objCanvas.redraw( mtx );
			
		} else if( objCanvas.mouseStatus.scaling ){
			// mousedownの位置から現在のカーソル位置までのベクトルを元に
			// リサイズと原点移動をする
			// x:+ または y:-の場合
			//   → 拡大し、原点をx:-方向へ、y:+方向へ移動
			// x:- または y:+の場合
			//   → 縮小し、原点をx:+方向へ、y:-方向へ移動
			
			// mousedown時点のmatrixを取得
			var mtx = objCanvas.getCurrentMatrix();
//console.log("currentMatrix");
//matrixlib.show(mtx);
			
			// 原点位置
			var originPoint = [
				mtx[0][2],
				mtx[1][2]
			];
			
			// 原点位置->mousedownの位置
			var vec = [
				objCanvas.mouseStatus.mouseDownPos.x - originPoint[0],
				objCanvas.mouseStatus.mouseDownPos.y - originPoint[1]
			];
//console.log(vec);
			
			// ドラッグした距離の目安
			// xは増加すると大、yは減少すると大
			var dragLen =
				curPos.x - objCanvas.mouseStatus.mouseDownPos.x +
				(-1)*(curPos.y - objCanvas.mouseStatus.mouseDownPos.y);
			// mousedown前に対するスケール
			var curScale = Math.pow(1.5, dragLen/100);
//console.log("scale:"+curScale);
			
			// 移動量と、拡大/縮小量が決定したので、メンバ変数へ記憶する
			// 現在のカーソル位置->mousedownの位置方向にcurScale倍した分の移動
			objCanvas.mouseStatus.scalingDistance = 
				[
					(curScale-1) * vec[0] * (-1),
					(curScale-1) * vec[1] * (-1)
				];
			objCanvas.mouseStatus.scalingExpandRate = curScale;
			
			// 平行移動
			matrixlib.move(mtx,
				objCanvas.mouseStatus.scalingDistance
			);
//matrixlib.show(mtx);
			
			// 拡大/縮小
			matrixlib.expand( mtx, objCanvas.mouseStatus.scalingExpandRate );
//matrixlib.show(mtx);
			
			// 描画
			objCanvas.redraw( mtx );
			
		}
		
		// マウスマークを描く
		if( objCanvas.drawMouseMark ){
			var ctx = $("#"+$(this).attr("id"))[0].getContext("2d");
			
			var orgStyle = ctx.strokeStyle;
			var orgLineWidth = ctx.lineWidth;
			ctx.strokeStyle = "rgb(255,0,0)";
			ctx.lineWidth = 2;
			
			ctx.beginPath();
			ctx.arc(objCanvas.mouseStatus.mouseDownPos.x,objCanvas.mouseStatus.mouseDownPos.y,
				10, 0, Math.PI*2, true);
			ctx.moveTo(objCanvas.mouseStatus.mouseDownPos.x,objCanvas.mouseStatus.mouseDownPos.y);
			ctx.lineTo(curPos.x, curPos.y);
			ctx.stroke();
			
			ctx.strokeStyle = orgStyle;
			ctx.lineWidth = orgLineWidth;
		}
	});
	
	
	// mousewheelevent
	var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
	$("#"+this.canvasName).on(mousewheelevent,function(e){
		// ホイールイベントの情報
		e.preventDefault();
		var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);
		
		var objCanvas = $("#"+$(this).attr("id"))[0].getCanvasObject();
		var clientX = e.originalEvent.clientX;
		var clientY = e.originalEvent.clientY;
//console.log(e);
		
		var curPos = {
			x : clientX - objCanvas.clientRect.left,
			y : clientY - objCanvas.clientRect.top
		};
		
		// 元のmatrixを取得
		var mtx = objCanvas.getCurrentMatrix();
//console.log("currentMatrix");
//matrixlib.show(mtx);
		
		// 原点位置
		var originPoint = [
			mtx[0][2],
			mtx[1][2]
		];
		
		// 原点位置->現在の位置
		var vec = [
			curPos.x - originPoint[0],
			curPos.y - originPoint[1]
		];
//console.log(vec);
		
		// 拡大/縮小率
		var curScale = (delta>0) ? 1.2 : 0.8;
		
		// 移動量と、拡大/縮小量が決定したので、メンバ変数へ記憶する
		// 現在のカーソル位置->mousedownの位置方向にcurScale倍した分の移動
		objCanvas.mouseStatus.scalingDistance = 
			[
				(curScale-1) * vec[0] * (-1),
				(curScale-1) * vec[1] * (-1)
			];
		objCanvas.mouseStatus.scalingExpandRate = curScale;
		
		// 平行移動
		matrixlib.move(mtx,
			objCanvas.mouseStatus.scalingDistance
		);
//matrixlib.show(mtx);
		
		// 拡大/縮小
		matrixlib.expand( mtx, objCanvas.mouseStatus.scalingExpandRate );
//matrixlib.show(mtx);
		
		// 描画
		objCanvas.redraw( mtx );
		
		// そのまま、位置と拡大率を確定する
		objCanvas.expandRate *= objCanvas.mouseStatus.scalingExpandRate;
		objCanvas.originPos.x += objCanvas.mouseStatus.scalingDistance[0];
		objCanvas.originPos.y += objCanvas.mouseStatus.scalingDistance[1];
	});


}
