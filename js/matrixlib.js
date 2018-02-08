/*
 * matrixlib.js
 * 2018 (c) yo16
 *
 * 2Dの移動、拡大、回転の行列を計算する
 *
 * matrixの定義
 * |a b c|
 * |d e f|
 * |g h i|
 * mtx = [[a,b,c],[d,e,f],[g,h,i]]
 * a = mtx[0][0]
 * b = mtx[0][1]
 * c = mtx[0][2]
 * d = mtx[1][0]
 * e = mtx[1][1]
 * f = mtx[1][2]
 * g = mtx[2][0]
 * h = mtx[2][1]
 * i = mtx[2][2]
 */

var matrixlib = {
	// move
	// 3x3matrixに対して、vecの移動を加える
	move : function( mtx, vec ){
		mtx[0][2] += vec[0];
		mtx[1][2] += vec[1];
	},
	
	// expand
	// 3x3matrixに対して、expの拡大を加える
	// expがベクトルの場合は、軸指示の拡大
	expand : function( mtx, exp ){
		var e1 = 0;
		var e2 = 0;
		if( Array.isArray(exp) ){
			e1 = exp[0];
			e2 = exp[1];
		}else{
			e1 = exp;
			e2 = exp;
		}
		mtx[0][0] *= e1;
		mtx[1][0] *= e1;
		mtx[2][0] *= e1;
		mtx[0][1] *= e2;
		mtx[1][1] *= e2;
		mtx[2][1] *= e2;
	},
	
	// rotate
	// 3x3matrixに対して、原点を中心とした反時計回りの回転を加える
	// rotはラジアン
	rotate : function( mtx, rot ){
		var cos = Math.cos(rot);
		var sin = Math.sin(rot);
		
		return this.apply3x3( mtx,
			[
				[ cos, (-1)*sin, 0 ],
				[ sin,      cos, 0 ],
				[   0,        0, 1 ]
			]
		);
	},
	
	// 配列をコピーして返す
	copy : function(mtx){
		return [
			[mtx[0][0], mtx[0][1], mtx[0][2]],
			[mtx[1][0], mtx[1][1], mtx[1][2]],
			[mtx[2][0], mtx[2][1], mtx[2][2]]
		];
	},
	
	// 配列にベクトルをかけた結果を返す
	// mtx * vec
	apply3x1 : function(mtx, vec){
		return [
			mtx[0][0]*vec[0] + mtx[0][1]*vec[1] + mtx[0][2],
			mtx[1][0]*vec[0] + mtx[1][1]*vec[1] + mtx[1][2]
		];
	},
	
	// 配列×配列
	// mtx1 * mtx2
	apply3x3 : function(mtx1, mtx2){
		var ret = [[0,0,0],[0,0,0],[0,0,0]];
		
		for( var i=0; i<3; i++ ){
		for( var j=0; j<3; j++ ){
			ret[i][j] = mtx1[i][0] * mtx2[0][j] + 
						mtx1[i][1] * mtx2[1][j] + 
						mtx1[i][2] * mtx2[2][j];
		}}
		
		return ret;
	},
	
	// 表示
	show : function(mtx){
		console.log(
			"|" + mtx[0][0] + ", " + mtx[0][1] + ", " + mtx[0][1] + "|\n" + 
			"|" + mtx[1][0] + ", " + mtx[1][1] + ", " + mtx[1][2] + "|\n" + 
			"|" + mtx[2][0] + ", " + mtx[2][1] + ", " + mtx[2][2] + "|"
		);
	}
};
