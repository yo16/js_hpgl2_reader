/*
 * clsImage
 *
 * 2016 (c) y.ikeda
 */

function clsImage( pInCanvasName )
{
	// 当クラスで保持する画像情報
	this.img = null;

	// 元となったcanvas名
	this.sourceCanvasName = pInCanvasName;
	
	// this.imgへ画像を作る
	this.setImage = function(){
		// canvas名から画像ファイルを作成し、URLを内部変数へ格納
		this.img = new Image();
		this.img.src = $("#" + this.sourceCanvasName )[0].toDataURL();
	};
	// 画像情報を作成
	this.setImage();
	
	// 出力
	// ここで渡されるmatrixは、左上の原点座標系を左下へ変換するものなので
	// 渡された直後に左上原点座標系へ変換する。
	// 高速化するネタの１つ。
	this.draw = function( matrix, canvasName )
	{
		var ctx = $("#"+canvasName)[0].getContext("2d");
		
		// 原点位置を取得
		var originPos = matrixlib.apply3x1(matrix, [0,0]);

		// 拡大率を取得
		// matrixにvec(1.0, 0)を適用した結果の長さを得る
		// hpgl2の拡大/縮小率の求め方と違うけどまぁいいか・・・。
		var vec1 = matrixlib.apply3x1( matrix, [1.0, 0.0, 0.0] );
		var expandRate = matrixlib.vecLen(
			[
				originPos[0] - vec1[0],
				originPos[1] - vec1[1]
			]
		);
		
		// source->destination
		// 元の画像の一部を、canvasのどこに描画するか、という意味の引数
		var sx = 0;
		var sy = 0;
		var sw = this.img.width;
		var sh = this.img.height;
		var dx = originPos[0];
		var dy = originPos[1];
		var dw = sw * matrix[0][0];
		var dh = sh * matrix[1][1];
		
		ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
	};
}
