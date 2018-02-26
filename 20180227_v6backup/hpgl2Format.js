/*
 * hpgl2Format
 *
 * 2016 (c) y.ikeda
 */

// console.*の出力設定
var hpgl2FormatDebugSetting = 3;	// [0:all
									//  1:error+warn+log
									//  2:error+warn
									//  3:error
									//  >3:(none)]

var Instructions = {
//	settings : {'BP':null, 'IN':null, 'LT':null, 'NP':null, 'PS':null, 'RO':null, 'SD':null, 'SS':null, 'PW':null, 'PG':null},
	settings : {'BP':null, 'IN':null, 'LT':null, 'NP':null, 'PS':null, 'RO':null, 'SD':null, 'SS':null,            'PG':null},
//	drawings : {'AA':null, 'CI':null, 'PA':null, 'PD':null, 'PU':null, 'SP':null}
	drawings : {'AA':null, 'CI':null, 'PA':null, 'PD':null, 'PU':null, 'PW':null, 'SP':null}
};
var AutoPDCommandList = {
	"CI":null,"EA":null,"EP":null,"ER":null,"EW":null,
	"FP":null,"LB":null,"PE":null,"RA":null,"RR":null,
	"SM":null,"WG":null
};
var Hpgl2Format = {
	/*
	AA, Arc Absolute
	
	Purpose
		To draw an arc, using absolute coordinates, which starts at the current pen location and pivots
		around the specified center point.
	Syntax
		AA Xcenter,Ycenter,sweep_angle[,chord_angle][;]
	
	p.100
	*/
	AA : function(curPos, p){
		if( p.length < 3 ){
			if( hpgl2FormatDebugSetting <= 3 ){
				console.error("[Error] AA 引数の数が不足("+p.length+")");
			}
			return {};
		}

		// 中心
		var posCenter = [
			p[0] - 0,
			p[1] - 0
		];
		// 回転する角度
		var sweepAngle = p[2] - 0;

		// 半径
//			var radius = Math.sqrt(Math.pow(curState.curPos.x - posCenter.x, 2)
//				+ Math.pow(curState.curPos.y - posCenter.y, 2));

		// 弦角度＝近似円を直線で描く角度
		var chordAngle = 5.0;
		if( p.length > 3 ){
			chordAngle = p[3] - 0;
		}

		// 開始位置
		var posStart = [
			curPos[0],
			curPos[1]
		];

		// 円上の点を取得
		var aryPoints = getCirclePoints(posCenter, posStart, sweepAngle, chordAngle);

		return {points:aryPoints};
	},
	
	/*
	BP,Begin Plot
	Syntax
		BP kind,value...[,kind,value][;]
			or
		BP[;]
	p.113
	
	kind,valueの指定は、不要と判断し、未実装。
	※ kind:
		1:PictureName
		2:Number of copies
		3:File-disposition code
		4:Render last plot if unfinished
		5:Autorotation
	指定があっても無視する。
	*/
	BP : function(curPos, p){
		// 今のところ実装なし
		if( hpgl2FormatDebugSetting <= 2 ){
			console.warn("[Warn] BP was called.(未実装)");
		}
		return {};
	},
	
	/*
	CI, Circle
	
	Purpose
		To draw the circumference of a circle using the specified radius and chord angle. If you want a
		filled circle, refer to the WG (Fill Wedge) instruction on page 324 or Drawing Circles in Polygon
		Mode on page 52.
	Syntax
		CI radius[,chord_angle][;]
	
	p.123
	
	*/
	CI : function(curPos, p){
		if( p.length == 0 ){
			if( hpgl2FormatDebugSetting <= 3 ){
				console.error("[Error] CI no-parameter!");
			}
			return {};
		}

		// 中心
		var posCenter = [
			curPos[0] - 0,
			curPos[1] - 0
		];
		// 半径
		var radius = p[0]-0;

		// 弦角度＝近似円を直線で描く角度
		var chordAngle = 5.0;
		if( p.length > 1 ){
			chordAngle = p[1] - 0;
		}

		// 現在のplot位置は円の中心なので、そこから開始位置を算出（X方向へ移動するだけ）
		var posStart = [
			curPos[0] + radius,
			curPos[1]
		];

		// 円上の点を取得
		var aryPoints = getCirclePoints(curPos, posStart, 360, chordAngle);
		
		return {points:aryPoints};
	},
	
	/*
	IN,Initialize
	Syntax
		IN n[;]
			or
		IN [;]
	p.189
	
	nの指定は、不要と判断し、実装。
	※ n:プロッタに設定したセット番号。
	指定があっても無視する。
	*/
	IN : function(curPos, p){
		// 実装なし
		if( hpgl2FormatDebugSetting <= 2 ){
			console.warn("[Warn] IN was called.(未実装)");
		}
		return {};
	},
	
	/*
	LT, Line Type
	
	Purpose
		To specify the line pattern to be used when drawing lines. Use LT to vary lines and enhance
		your plot. Note that the ends of dashed line segments in a line pattern are affected by current
		line attributes (refer to the LA instruction on page 200).
	Syntax
		LT line_type[,pattern_length[,mode]][;]
			or
		LT [;]
			or
		LT 99 [;]
	
	p.215

	更新前の値の保持の機能は未実装。
	*/
	LT : function(curPos, p){
	    var ret = {settings:{}};
		if( p.length > 0 ){
            ret.settings["LineType"] = p[0];
		}
		if( p.length > 1 ){
            ret.settings["LineTypePatternLength"] = p[1]-0;
		}
		if( p.length > 2 ){
            ret.settings["LineTypeMode"] = p[2];
		}

		return ret;
	},
	
	/*
	NP, Number of Pens

	Purpose
		To establish the size (the number of pens) of the HP-GL/2 palette.
	Syntax
		NP n[;]
			or
		NP [;]
	*/
	NP : function(curPos, p){
		var ret = {settings:{NumberOfPens:8}};
		// The default palette size for monochrome raster devices is 2.
		// The default palette size for color raster devices is 8.
		// （深く考えずに８固定）

		if( p.length > 0 ){
			var n = p[0] - 0;
			if( n % 2 != 0 ){	// Parameter must be a power of two.（２のべき乗の超ラフチェック）
				if( hpgl2FormatDebugSetting <= 3 ){
					console.error("[Error] NP(Number of Pens) Parameter must be a power of two.("+n+")");
				}
				return ret;
			}
			ret.settings.NumberOfPens = n;

/*
			// PWを初期化する
			this.PW([0.25,1], ctx, curState, matrix);
			this.PW([0.35,2], ctx, curState, matrix);
			this.PW([0.5,3], ctx, curState, matrix);
			this.PW([1,4], ctx, curState, matrix);
*/
		}

		return ret;
	},
	
	/*
	PA, Plot Absolute
	
	Purpose
		To establish absolute plotting and moves the pen to the specified absolute coordinates from the
		current pen position.
	Syntax
		PA X,Y [,...][;]
			or
		PA [;]
	*/
	PA : function(curPos, p){
		var aryPoints = new Array();
		if( p.length % 2 != 0 ){
			if( hpgl2FormatDebugSetting <= 3 ){
				console.error("[Error] PNのパラメータ数が奇数");
			}
			return {};
		}else{
			for( var i=0; i<p.length; i+=2 ){
				aryPoints.push([p[i]-0,p[i+1]-0]);
			}
		}
		return {points:aryPoints};
	},
	
	/*
	PD, Pen Down
	
	Purpose
		To lower the device’s logical pen and draw subsequent graphics instructions.
	
	Syntax
		PD X,Y[,...][;]
		or
		PD [;]	
	
	未実装だけどメモ
	PDでsettings.PenDown=trueとpointsも指定した場合は、先にPenDown、その後にPointsなので、描画される
	*/
	PD : function(curPos, p){
		if( p.length > 0 ){
			if( hpgl2FormatDebugSetting <= 2 ){
				console.warn("[Warn] PDにX,Yの引数あり(未実装)");
			}
		}
		return {settings:{PenDown:true}};
	},
	
	/*
	PG, Advance Full Page

	Purpose
		For devices with page advance capability: to terminate the plot being sent, to draw it, and to
		advance the page.
		For devices without page advance capability: If the media has been plotted on, to perform the
		function of the NR (Not Ready) instruction (see page 227).
		On PCL devices with HP-GL/2 capability, this instruction is ignored (see Using PG in a PCL
		Dual-Context Environment below).
	Syntax
		PG n[;]
			or
		PG [;]

	*/
	PG : function(curPos, p){
		// 実装なし
		if( hpgl2FormatDebugSetting <= 2 ){
			console.warn("[Warn] PG was called.(未実装)");
		}
		return {};
	},
	
	/*
	PS,Plot Size
	Syntax
		PS length[,width][;]
			or
		PS [;]
	p.259
	*/
	PS : function(curPos, p){
		var ret = {};
		if( p.length > 0 ){
			ret["settings"] = {};
			ret.settings["length"] = p[0]-0;
		}
		if( p.length > 1 ){
			ret.settings["width"] = p[1]-0;
		}
		return ret;
	},
	
	/*
	PU, Pen Up
	
	Purpose
		To move to subsequent points without drawing. Use PU to move to another location without
		drawing a connecting line.
	
	Syntax
		PU X,Y[,...;]
		or
		PU [;]
		
	メモ
	PUでsettings.PenDown=trueとpointsも指定した場合は、先にPenDown、その後にPointsなので、描画される
	*/
	PU : function(curPos, p){
		var ret = {settings:{PenDown:false}};

		if( p.length > 0 ){
			// 引数があった場合は、ペンを移動する。
			// 描画は不要なので、最後の点だけをPointsに入れる。
			if( p.length % 2 != 0 ){
				if( hpgl2FormatDebugSetting <= 3 ){
					console.error("[Error] PUの引数の数が奇数.");
				}
				return {};
			}

			ret["points"] = new Array([p[p.length-2], p[p.length-1]]);
		}
		return ret;
	},
	
	/*
	PW, Pen Width
	
	Purpose
		To specify a new width for the logical pen. Subsequent lines are drawn in this new width. Use
		PW to vary your lines and enhance your drawings. Pen width can be specified as a fixed value
		or relative to the distance between P1 and P2. The pen width units are selected using the WU
		instruction (the default is metric—millimeters).
	Syntax
		PW width[,pen][;]
			or
		PW [;]
	
	p.264
	*/
	PW : function(curPos, p){
		// ※1
		// 下記の文章の意味がわからない
		// all pensでなく、both pens??
		// If the pen parameter is not specified, the device applies the width to both pens.
		// とりあえず、allと解釈しておく
		// ※2
		// 引数なしの場合は、WU(Pen Width Unit Selection)がmetricと決めて
		// PenWidth=0.35で設定して返す。
		var ret = {settings:{}};

		var defaultPenWidth = 0.35;
//		var penWidth = defaultPenWidth;
//		var penNumber = -1;

		if( p.length == 0 ){
			ret.settings["PenWidth"] = defaultPenWidth;
		}else{
			ret.settings["PenWidth"] = p[0]-0;
		}
		if( p.length > 1 ){
			ret.settings["PenNumber"] = p[1]-0;
		}

		return ret;
	},
	
	/*
	RO, Rotate Coordinate System
	
	Syntax
		RO angle[;]
			or
		RO [;]
	p.275
	
	反時計回りに回転。
	デフォルト0。
	*/
	RO : function(curPos, p){
		// 実装なし
		if( hpgl2FormatDebugSetting <= 2 ){
			console.warn("[Warn] RO was called.(未実装)");
		}
		return {};
	},
	
	/*
	SD, Standard Font Definition
	
	Syntax
		SD kind,value...[,kind,value] [;]
			or
		SD [;]
	
	p.296
	
	Kind    Attribute       Range of Values         Default Value       Description
	------- --------------- ----------------------- ------------------- ---------------------
	1       Character set   device-dependent        277                 Roman-8
	2       Font Spacing    0 (fixed),              device-dependent    fixed spacing
	                        1 (proportional)
	3       Pitch           >0 to 32 767 (valid to  device-dependent    characters per inch
	                        2 decimal places)
	4       Height          0 to 32 767             device-dependent    font point size
	5       Posture         0 to 32 767             device-dependent    upright or italic
	6       Stroke Weight   -7 to 7, 9999           0                   normal
	7       Typeface        device-dependent        device-dependent    scalable font

	メモ
	RelatedInstructions
		AD Alternate Font Definition
		DT Define Label Terminator
		FI Select Primary Font
		FN Select Secondary Font
		LB Label
		SA Select Alternate Font
		SB Scalable or Bitmap Fonts
		SI Absolute Character Size
		SR Relative Character Size
		SS Select Standard Font
		TD Transparent Data
	
	*/
	SD : function(curPos, p){
		var ret = {settings:{}};
		if( p.length % 2 != 0 ){
			if( hpgl2FormatDebugSetting <= 3 ){
				console.error("[Error] SD 引数の数が不正");
			}
			return {};
		}

		for( var i=0; i<p.length; i+=2 ){
			if( p[i]==1 ){
				// Kind=1:Character set
				ret.settings["CharactorSet"] = p[i+1];
			}else if( p[i]==2 ){
				// Kind=2:Font Spacing
				ret.settings["FontSpacing"] = p[i+1];
			}else if( p[i]==3 ){
				// Kind=3:Pitch
				ret.settings["Pitch"] = p[i+1];
			}else if( p[i]==4 ){
				// Kind=4:Height
				ret.settings["FontHeight"] = p[i+1];
			}else if( p[i]==5 ){
				// Kind=5:Posture
				ret.settings["FontPosture"] = p[i+1];
			}else if( p[i]==6 ){
				// Kind=6:Stroke Weight
				ret.settings["StrokeWeight"] = p[i+1];
			}else if( p[i]==7 ){
				// Kind=7:Typeface
				ret.settings["Typeface"] = p[i+1];
			}
		}

		return ret;
	},
	
	/*
	SP, Select Pen
	
	Purpose
		To select the device’s logical pen for subsequent plotting. An SP instruction must be included
		at the beginning of each instruction sequence to enable the device to draw.
	Syntax
		SP pen_number[;]
			or
		SP [;]
	
	p.306
	*/
	SP : function(curPos, p){
		var ret = {settings:{PenNumber:0}};
		if( p.length > 0 ){	// 引数なしのときは"SP0"と同等。
			ret.settings.PenNumber = p[0]-0;
		}

		return ret;
	},
	
	/*
	SS, Select Standard Font
	
	Syntax
		SS [;]
	
	p.311
	*/
	SS : function(curPos, p){
		// 今のところ実装なし
		if( hpgl2FormatDebugSetting <= 2 ){
			console.warn("[Warn] SS was called.(未実装)");
		}
		return {};
	}
	
	
	/*
	雛形
	AA : function(p, ctx, curState){
	*/
};

// getCirclePoints
// 中心、開始位置、描画する角度、弦角度から、描画点群を得る。
// 円弧を、円弧で描かず線群で描くときに利用する。
// 戻り値は、{x,y}の配列。１点目は引数の開始位置の次の１点目。
// 引数
//	posCenter	: 中心{x,y}
//	posBegin	: 開始位置{x,y}
//	a			: 描画する角度（度）
//	chord		: 弦角度＝円弧でなく直線で描く角度（度）
function getCirclePoints(posCenter, posBegin, a, chord)
{
	var points = new Array();
//	points.push(posBegin);
// １点目は、引数の開始位置の次へ変更するため、コメントアウト。
// いつか気が変わって、開始位置にまた戻したくなったときのために残しておく。
// １点目をposBeginにしなかった理由は、円弧だけでなくPAもこの仕様にあわせる必要があり、
// PAで１点目を含めることは不自然さを感じたため。
	
	chord = chord - 0;
	var cos = Math.cos(Math.PI*chord/180);
	var sin = Math.sin(Math.PI*chord/180);
	
	var curAngle = 0.0;
	var prevPos = [posBegin[0], posBegin[1]];
	while(curAngle < a)
	{
		var curPos = [0.0, 0.0];
		curPos[0] = prevPos[0];
		curPos[1] = prevPos[1];
		
		// 回転中心を原点へ変更移動
		curPos[0] -= posCenter[0];
		curPos[1] -= posCenter[1];
		
		// chord分回転
		var tmpx = curPos[0];
		var tmpy = curPos[1];
		curPos[0] = tmpx * cos - tmpy * sin;
		curPos[1] = tmpx * sin + tmpy * cos;
		
		// 原点から回転中心へ平行移動
		curPos[0] += posCenter[0];
		curPos[1] += posCenter[1];
		
		// pointsへ登録
		points.push( curPos );
		
		prevPos[0] = curPos[0];
		prevPos[1] = curPos[1];
		
		curAngle += chord;
	}
	
	return points;
}

