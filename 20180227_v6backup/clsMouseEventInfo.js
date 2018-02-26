/*
 * clsMouseEventInfo
 *
 * 2016 (c) y.ikeda
 *
 * canvas１つに１インスタンス持つ想定。
 * このクラス内では、基本的には、左上が(0,0)の座標系とするが、
 * canvasクラスへ原点移動などの指示を出す際には、ここで調整して出す。
 */

// マウス操作によるdotに対する拡大/縮小の割合因子
const ExpandFactor = 0.01;

function clsMouseEventInfo(pCanvas)
{
	// 拡大縮小率
	this.expandRate = 1.0;
	// 平行移動した結果の原点位置
	// 左上が(0,0)なので、初期値は(0,CanvasHeight)
	this.originPos = [0, $("#"+pCanvas.canvasName).height()];
	
	// canvasのインスタンス（参照のみ）
	this.canvas = pCanvas;
	
	// マウス操作中(ドラッグ等)の情報
	this.movingMouseInfo = {
		// マウスダウンの位置
		mouseDownPos : [0.0, 0.0],
		
		// ドラッグ中フラグ
		dragging : false,
		// スクロール中フラグ
		scaling : false
	};
	
	// mousedown
	$("#"+this.canvas.canvasName).mousedown(function(e, cx, cy, btn){
		var objCanvas = $.data($("#"+$(this).attr("id"))[0], "objCanvas");
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy
		var button = (btn === undefined) ? e.button : btn;
		
		// ページスクロール量
		clientX += window.pageXOffset;
		clientY += window.pageYOffset;

		var curPos = [
			clientX - objCanvas.clientRect.left,
			clientY - objCanvas.clientRect.top
		];
		
		if( (button == 0) || (button==2) ){
			// mousedown時の情報を記憶
			// downPos
			objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[0] = curPos[0];
			objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[1] = curPos[1];
			
			if( button == 0 ){			// 左クリック
				// 平行移動を開始
				objCanvas.mouseEvent.movingMouseInfo.dragging = true;
			}else if( button == 2 ){		// 右クリック
				// スケーリングを開始
				objCanvas.mouseEvent.movingMouseInfo.scaling = true;
			}
			
			if(0){	// for debug
				// クリック位置をHPGL2の座標値へ変換してログ出力
				var matInv = matrixlib.inverse(objCanvas.mtxHpgl2);
				var hpgl2Pos = matrixlib.apply3x1(matInv, objCanvas.mouseEvent.movingMouseInfo.mouseDownPos);
				console.log(hpgl2Pos);
			}

		}else if( button == 1 ){
 			// 中クリック時AutoScale
 			// 平行移動にしたい人もいるかもしれないけど、とりあえずAutoScale
 			objCanvas.doAutoScale = true;
 			objCanvas.redraw();

		}
	});
	
	// mouseup
	$("#"+this.canvas.canvasName).mouseup(function(e, cx, cy){
//console.log("mouseup!");
		var objCanvas = $.data($("#"+$(this).attr("id"))[0], "objCanvas");
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy;
		
		// ページスクロール量
		clientX += window.pageXOffset;
		clientY += window.pageYOffset;

		// 現在の原点位置で、matrixの値を更新
		var curPos = [
			clientX - objCanvas.clientRect.left,
			clientY - objCanvas.clientRect.top
		];
		// mousedown->現在の位置 のベクトル(左上が0,0)
		var moveVec = [
			curPos[0] - objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[0],
			curPos[1] - objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[1]
		];
		
		// draggingかscalingのときは、位置を更新する
		if( objCanvas.mouseEvent.movingMouseInfo.dragging ){
			// dragging
			// objCanvas.matrixを更新
			objCanvas.mtxHpgl2 = matrixlib.move( objCanvas.mtxHpgl2, moveVec );
			objCanvas.mtxImage = matrixlib.move( objCanvas.mtxImage, moveVec );

		}else if( objCanvas.mouseEvent.movingMouseInfo.scaling ){
			// mousedown->現在の位置のベクトルから、拡大率を決める
			// xは大きいほど拡大、yは小さいほど拡大
			var expVal = Math.exp((moveVec[0]-moveVec[1])*ExpandFactor);

			// マウスダウンの位置を中心に拡大するmatrixを取得
			objCanvas.mtxHpgl2 = matrixlib.expandWithCenter(objCanvas.mtxHpgl2, expVal, objCanvas.mouseEvent.movingMouseInfo.mouseDownPos);
			objCanvas.mtxImage = matrixlib.expandWithCenter(objCanvas.mtxImage, expVal, objCanvas.mouseEvent.movingMouseInfo.mouseDownPos);
			
		}
		// 更新したら再描画
		if( objCanvas.mouseEvent.movingMouseInfo.dragging || objCanvas.mouseEvent.movingMouseInfo.scaling ){
			objCanvas.redraw();
		}
		
		objCanvas.mouseEvent.movingMouseInfo.dragging = false;
		objCanvas.mouseEvent.movingMouseInfo.scaling = false;
	});
	
	// mousemove
	$("#"+this.canvas.canvasName).mousemove(function(e, cx, cy){
		var objCanvas = $.data($("#"+$(this).attr("id"))[0], "objCanvas");
		var clientX = (cx === undefined) ? e.clientX : cx;
		var clientY = (cy === undefined) ? e.clientY : cy;
		
		// ページスクロール量
		clientX += window.pageXOffset;
		clientY += window.pageYOffset;

		// ドラッグ中でも拡大縮小中でもない場合は、何もしない
		if( !(objCanvas.mouseEvent.movingMouseInfo.dragging || objCanvas.mouseEvent.movingMouseInfo.scaling) ){
			return;
		}
		
		// 現在の位置(canvasの左上が0,0)
		var curPos = [
			clientX - objCanvas.clientRect.left,
			clientY - objCanvas.clientRect.top
		];
		// mousedown->現在の位置 のベクトル(左上が0,0)
		var moveVec = [
			curPos[0] - objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[0],
			curPos[1] - objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[1]
		];

		if( objCanvas.mouseEvent.movingMouseInfo.dragging ){
			// mousedownの位置から現在の位置まで移動したmatrixを使用して、
			// redrawする準備をする
			var movingMtxHpgl2 = matrixlib.move( objCanvas.mtxHpgl2, moveVec );
			var movingMtxImage = matrixlib.move( objCanvas.mtxImage, moveVec );
			// 描画
			// objCanvas.mtxHpgl2ではなく、mousedown時点のobjCanvas.mtxHpgl2から一時的に作り出したmovingMtxを更新して使う。
			// objCanvas.mtxHpgl2は、mouseupのときに更新する。
			objCanvas.redraw(movingMtxHpgl2, movingMtxImage);

		} else if( objCanvas.mouseEvent.movingMouseInfo.scaling ){
			// mousedown->現在の位置のベクトルから、拡大率を決める
			// xは大きいほど拡大、yは小さいほど拡大
			var expVal = Math.exp((moveVec[0]-moveVec[1])*ExpandFactor);
//console.error("ここで拡大率とかを決めちゃうんじゃなくて、変化率をredrawへ通知する？");

			// マウスダウンの位置を中心に拡大するmatrixを取得
			var expandMtxHpgl2 = matrixlib.expandWithCenter(objCanvas.mtxHpgl2, expVal, objCanvas.mouseEvent.movingMouseInfo.mouseDownPos);
			var expandMtxImage = matrixlib.expandWithCenter(objCanvas.mtxImage, expVal, objCanvas.mouseEvent.movingMouseInfo.mouseDownPos);

			// 描画
			objCanvas.redraw(expandMtxHpgl2, expandMtxImage);
			
		}
		
		// マウスマークを描く
		if( objCanvas.drawMouseMark ){
			var ctx = $("#"+$(this).attr("id"))[0].getContext("2d");
			
			var orgStrokeStyle = ctx.strokeStyle;
			var orgFillStyle = ctx.fillStyle;
			var orgLineWidth = ctx.lineWidth;
			ctx.strokeStyle = "rgb(255,0,0)";
			ctx.fillStyle = "rgba(255,0,0,0.5)";
			ctx.lineWidth = 2;
			
			ctx.beginPath();
			ctx.arc(objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[0],objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[1],
				10, 0, Math.PI*2, true);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[0],objCanvas.mouseEvent.movingMouseInfo.mouseDownPos[1]);
			ctx.lineTo(curPos[0], curPos[1]);
			ctx.stroke();
			
			ctx.strokeStyle = orgStrokeStyle;
			ctx.fillStyle = orgFillStyle;
			ctx.lineWidth = orgLineWidth;
		}
	});
	
	
	// mousewheelevent
	var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
	$("#"+this.canvas.canvasName).on(mousewheelevent,function(e){
		// ホイールイベントの情報
		e.preventDefault();
		var delta = e.originalEvent.deltaY ?
			-(e.originalEvent.deltaY) : 
			(e.originalEvent.wheelDelta ? 
				(e.originalEvent.wheelDelta) : -(e.originalEvent.detail)
			);
		if( delta > 0 ){
			delta = 1;
		}else{
			delta = -1;
		}
		// 拡大縮小率を決定
		var expVal = 1+delta*0.1;

		var objCanvas = $.data($("#"+$(this).attr("id"))[0], "objCanvas");
		var clientX = e.originalEvent.clientX;
		var clientY = e.originalEvent.clientY;
		
		// ページスクロール量
		clientX += window.pageXOffset;
		clientY += window.pageYOffset;

		// 現在の位置
		var curPos = [
			clientX - objCanvas.clientRect.left,
			clientY - objCanvas.clientRect.top
		];
		
		// 現在の位置を中心に拡大するmatrixを取得
		objCanvas.mtxHpgl2 = matrixlib.expandWithCenter(objCanvas.mtxHpgl2, expVal, curPos);
		objCanvas.mtxImage = matrixlib.expandWithCenter(objCanvas.mtxImage, expVal, curPos);

		// 描画
		objCanvas.redraw();
	});
}

