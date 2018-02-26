/*
 * HPGL2 reader
 *
 * 2016 (c) y.ikeda
 */

var objCanvas1 = null;
var objCanvas1_img = null;

$(document).ready(function(){
	
	// canvasの設定
	objCanvas1 = new clsCanvas( "canvas1" );
	// jqueryの検索からobjCanvasを取得できるようにする
	$("#canvas1")[0].getCanvasObject = function(){
		return objCanvas1;
	};
	objCanvas1_img = new clsCanvas( "canvas1_img" );
	$("#canvas1_img")[0].getCanvasObject = function(){
		console.log("canvas1_img.getCanvasObject");
		return objCanvas1_img;
	}
	
	// ファイル選択ボタン
	$("#inputFile1").change(function(e){
		if( e.target.files.length == 0 ) return;
		var fileInfo = e.target.files[0];
		
console.time("readFile");
		// ファイルを読む
		var reader = new FileReader();
		reader.readAsText( fileInfo );
console.timeEnd("readFile");
		
		// canvasへ追加
		reader.onload = function( evt ){
			objCanvas1.addFile( fileInfo, evt.target.result );
			
			// autoScaleしない設定
console.warn("一時的に、AutoScaleをする対応。将来的にはautoScaleはしない。Imageの作成のため。");
			objCanvas1.doAutoScale = false;		// true:する | false:しない
//			objCanvas1.doAutoScale = true;// 一時対応
			// 拡大率を指定
//			var valAccuracy = $("#selAccuracy").val() - 0;
			// 1倍が40なので、変換して指定
//			objCanvas1.expandRate = valAccuracy / 40;
			
			// CavasをDpi値に従ったサイズに設定
			changeMatrixForDpi();

			// canvasを再描画
			objCanvas1.redraw();
			
			// canvasをimg化
			objCanvas1_img.addImageFrom( objCanvas1.canvasName );
			objCanvas1_img.redraw();
		};
		
	});

	// Plot精度を変更したら、changeDpiを呼ぶ
	$("#selAccuracy").change(function(){
		// canvasをDPI値にあったサイズへ変更
		changeMatrixForDpi();

		// 再描画
		[objCanvas1, objCanvas1_img].forEach(function(cvs){
			cvs.redraw();
		});
	});
	
	// デバッグボタン
	var cx = 200;
	var cy = 150;
	$("#btnDebug_ldown").click(function(){
		cx = $("#canvas1")[0].width / 2;
		cy = $("#canvas1")[0].height / 2;
		console.log([cx, cy]);
		// 左マウスダウン
		$("#canvas1").trigger("mousedown",[
			cx,
			cy,
			0		// 0:左クリック | 2:右クリック
		]);
		
	});
	$("#btnDebug_rdown").click(function(){
		cx = $("#canvas1")[0].width / 2;
		cy = $("#canvas1")[0].height / 2;
		console.log([cx, cy]);
		// 右マウスダウン
		$("#canvas1").trigger("mousedown",[
			cx,
			cy,
			2		// 0:左クリック | 2:右クリック
		]);
		
	});
	$("#btnDebug_moveUp").click(function(){
		// mousemoveUp
		cy -= 2;
		$("#canvas1").trigger("mousemove",[
			cx,
			cy
		]);
	});
	$("#btnDebug_moveDown").click(function(){
		// mousemoveDown
		cy += 2;
		$("#canvas1").trigger("mousemove",[
			cx,
			cy
		]);
	});
	$("#btnDebug_moveRight").click(function(){
		// mousemoveRight
		cx += 2;
		$("#canvas1").trigger("mousemove",[
			cx,
			cy
		]);
	});
	$("#btnDebug_moveLeft").click(function(){
		// mousemoveLeft
		cx -= 2;
		$("#canvas1").trigger("mousemove",[
			cx,
			cy
		]);
	});
	$("#btnDebug_up").click(function(){
		// mouseup
		$("#canvas1").trigger("mouseup",[
			cx,
			cy
		]);
		
	});
	$("#btnDebug").click(function(){
		var objImg = objCanvas1_img.imageObjects[0].img;
		var pixels = objImg.data;
//		pixelsは、よこ走査の１次元配列で、プラス0からRGB、プラス3でAlpha値
	});
});


// canvas1のhpgl2から高さ・幅を取得して
// dpi値に従って、canvas1_imgの現在のサイズに拡大/縮小するMatrixへ変更する
function changeMatrixForDpi()
{
	if( !objCanvas1 ) return;
	if( !objCanvas1_img ) return;

	// 選択されているDpi値
	var selectedDpi = $("#selAccuracy").val() - 0;
	
	// Dpiから高さ・幅を計算する
	var cvsHeight = 0;
	var cvsWidth = 0;
	{
		// 幅と高さを取得
		var maxHeight = objCanvas1.getMaxHeight();
		var maxWidth = objCanvas1.getMaxWidth();

		// 高さ:幅＝1:√2で作る前提で、サイズを決定する
		if( maxHeight * Math.sqrt(2) < maxWidth ){
			// 横幅がmaxになる
			cvsHeight = maxWidth / Math.sqrt(2);
			cvsWidth = maxWidth;
		}else{
			// 縦幅がmaxになる
			cvsHeight = maxHeight;
			cvsWidth = maxHeight * Math.sqrt(2);
		}

		// PSの単位 * 0.025 = mm = 1/25.4 inch
		cvsHeight *= 0.025 / 25.4;
		cvsWidth *= 0.025 / 25.4;

		// 高さと幅に、dpiを反映
		cvsHeight = Math.floor(cvsHeight * selectedDpi)+1;
		cvsWidth  = Math.floor(cvsWidth  * selectedDpi)+1;
	}
	// 本来は、(1)(cvsWidth, cvsHeight)の情報だが、
	// 現在は、(2)(maxWidth, maxHeight)になっているので、
	// 縦横それぞれの方向に拡大/縮小して表示するよう、(1)から(2)へ変更するようmatrixを変更する（canvasの大きさは変更しない）
	
	// 初期化
	objCanvas1_img.initializeCanvas();
	
	// canvas_imgのmatrixを変更
//	objCanvas1_img.mtxImage = matrixlib.expandWithCenter(objCanvas1_img.mtxImage, [maxWidth/cvsWidth, maxHeight/cvsHeight], [0,0]);
console.log([maxWidth/cvsWidth, maxHeight/cvsHeight]);
//なんかうまく動かない・・・・！
	// オートスケール
	objCanvas1_img.doAutoScale = true;
	
	// imageオブジェクトを再作成する
	objCanvas1_img.remakeImageObj();
};
