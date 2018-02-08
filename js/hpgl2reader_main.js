/*
 * HPGL2 reader
 *
 * 2018 (c) yo16
 */

var objCanvas = null;

$(document).ready(function(){
	
	// canvasの設定
	objCanvas = new clsCanvas( "canvas1" );
	// jqueryの検索からobjCanvasを取得できるようにする
	$("#canvas1")[0].getCanvasObject = function(){
		return objCanvas;
	};
	
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
			objCanvas.addFile( fileInfo, evt.target.result );
			
			// canvasを再描画
			objCanvas.redraw();
		};
		
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
});

