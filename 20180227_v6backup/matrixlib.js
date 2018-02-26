/*
 * matrixlib.js
 * 2016 (c) y.ikeda
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
		return this.apply3x3(
			[
				[1,0,vec[0]],
				[0,1,vec[1]],
				[0,0,1]
			],
			mtx
		);
	},
	
	// expand
	// 3x3matrixに対して、expの拡大を加える
	// expがスカラーの場合は、２軸方向へ同じだけ拡大
	// expがベクトルの場合は、各軸ごとに拡大率を指示する拡大
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
		return this.apply3x3(
			[
				[e1,0,0],
				[0,e2,0],
				[0,0,1]
			],
			mtx
		);
/*
		mtx[0][0] *= e1;
		mtx[1][0] *= e1;
		mtx[2][0] *= e1;
		mtx[0][1] *= e2;
		mtx[1][1] *= e2;
		mtx[2][1] *= e2;
*/
	},

	// expandWithCenter
	// 3x3matrixに対して、基準位置を指定した拡大を加える
	// expがスカラーの場合は、２軸方向へ同じだけ拡大
	// expがベクトルの場合は、各軸ごとに拡大率を指示する拡大
	expandWithCenter : function( mtx, exp, centerPos ){
		var e1 = 0;
		var e2 = 0;
		if( Array.isArray(exp) ){
			e1 = exp[0];
			e2 = exp[1];
		}else{
			e1 = exp;
			e2 = exp;
		}

// 呼び出し側で工夫できたので、速度を優先させるため、とりあえずコメントアウト
//		// 拡大率がゼロやマイナスを防止
//		if( e1<0.01 ){ e1 = 0.01; };
//		if( e2<0.01 ){ e2 = 0.01; };
		
		var mtxRet = matrixlib.copy(mtx);
		if( 0 ){ // 覚書として残しておく
			// 基準位置ベクトルの反対まで平行移動
			var negativeCenterPos = [(-1)*centerPos[0], (-1)*centerPos[1]];
			mtxRet = matrixlib.move( mtxRet, negativeCenterPos );
			// 原点中心に拡大縮小
			mtxRet = matrixlib.expand( mtxRet, exp );
			// 基準位置ベクトルまで平行移動
			mtxRet = matrixlib.move( mtxRet, centerPos);
		}else{
			// 上記をいっぺんに！
			mtxRet[0][0] = e1;
			mtxRet[0][1] = 0;
			mtxRet[0][2] = (-1)*e1*centerPos[0] + centerPos[0];
			mtxRet[1][0] = 0;
			mtxRet[1][1] = e2;
			mtxRet[1][2] = (-1)*e2*centerPos[1] + centerPos[1];
			mtxRet[2][0] = 0;
			mtxRet[2][1] = 0;
			mtxRet[2][2] = 1;
		}
		
		return this.apply3x3(
			mtxRet,
			mtx
		);
	},
	
	// rotate
	// 3x3matrixに対して、原点を中心とした反時計回りの回転を加える
	// rotはラジアン
	rotate : function( mtx, rot ){
		var cos = Math.cos(rot);
		var sin = Math.sin(rot);
		
		return this.apply3x3(
			[
				[ cos, (-1)*sin, 0 ],
				[ sin,      cos, 0 ],
				[   0,        0, 1 ]
			],
			mtx
		);
	},

	// reverse
	// 3x3matrixに対して、原点を中心に上下反転または左右反転をする
	// upsidedown [ true:上下反転 | false:左右反転 ]
	reverse : function( mtx, upsidedown )
	{
		var mtxReverse = [[1,0,0],[0,1,0],[0,0,1]];

		if( upsidedown ){
			// X軸を軸にして上下反転
			// ⇒　Y座標に-1を掛ける
			mtxReverse[1][1] = -1;
		}else{
			// Y軸を軸にして左右反転
			// ⇒　X座標に-1を掛ける
			mtxReverse[0][0] = -1;
		}
		return this.apply3x3( mtxReverse, mtx );
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
	// 備忘録
	// matrixlibの中からこれを呼ぶなら、めんどくさいけど、
	// １セルごとに更新した方が良い。無駄な掛け算と足し算が生まれる。
	apply3x3 : function(mtx1, mtx2){
		var ret = [[0,0,0],[0,0,0],[0,0,1]];
		
		for( var i=0; i<3; i++ ){
		for( var j=0; j<3; j++ ){
			ret[i][j] = mtx1[i][0] * mtx2[0][j] + 
						mtx1[i][1] * mtx2[1][j] + 
						mtx1[i][2] * mtx2[2][j];
		}}
		
		return ret;
	},

	// 逆行列を返す
	inverse : function(mtx){
		var det = mtx[0][0]*mtx[1][1]*mtx[2][2]
				+ mtx[1][0]*mtx[2][1]*mtx[0][2]
				+ mtx[2][0]*mtx[0][1]*mtx[1][2]
				- mtx[0][0]*mtx[2][1]*mtx[1][2]
				- mtx[2][0]*mtx[1][1]*mtx[0][2]
				- mtx[1][0]*mtx[0][1]*mtx[2][2];
		if( det == 0 ){
console.warn("inverse:det is zero.");
matrixlib.show(mtx);
			return mtx;
		}

		return [
			[ (mtx[1][1]*mtx[2][2] - mtx[1][2]*mtx[2][1]) / det,
			  (mtx[0][2]*mtx[2][1] - mtx[0][1]*mtx[2][2]) / det,
			  (mtx[0][1]*mtx[1][2] - mtx[0][2]*mtx[1][1]) / det],
			[ (mtx[1][2]*mtx[2][0] - mtx[1][0]*mtx[2][2]) / det,
			  (mtx[0][0]*mtx[2][2] - mtx[0][2]*mtx[2][0]) / det,
			  (mtx[0][2]*mtx[1][0] - mtx[0][0]*mtx[1][2]) / det],
			[ (mtx[1][0]*mtx[2][1] - mtx[1][1]*mtx[2][0]) / det,
			  (mtx[0][1]*mtx[2][0] - mtx[0][0]*mtx[2][1]) / det,
			  (mtx[0][0]*mtx[1][1] - mtx[0][1]*mtx[1][0]) / det]
		];
	},
	
	// 表示
	show : function(mtx){
		console.log(
			"|" + mtx[0][0] + ", " + mtx[0][1] + ", " + mtx[0][1] + "|\n" + 
			"|" + mtx[1][0] + ", " + mtx[1][1] + ", " + mtx[1][2] + "|\n" + 
			"|" + mtx[2][0] + ", " + mtx[2][1] + ", " + mtx[2][2] + "|"
		);
	},
	
	// ベクトルの長さ
	vecLen : function(vec){
		var col3 = (vec.length>=3)?(vec[2]*vec[2]) : 0;
		return Math.sqrt(vec[0]*vec[0]+vec[1]*vec[1]+col3);
	}
};
