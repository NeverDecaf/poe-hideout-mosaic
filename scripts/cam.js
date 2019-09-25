
Filters = {};
Filters.getPixels = function(img) {
  var c = this.getCanvas(img.width, img.height);
  var ctx = c.getContext('2d');
  ctx.drawImage(img,0,0);
  return ctx.getImageData(0,0,c.width,c.height);
};

Filters.getCanvas = function(w,h) {
  var c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

Filters.filterImage = function(filter, image, var_args) {
  var args = [this.getPixels(image)];
  for (var i=2; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  return filter.apply(null, args);
};

Filters.filterImageCanvas = function(filter, canvas, var_args) {
var ctx = canvas.getContext('2d');
  var args = [ctx.getImageData(0,0,canvas.width,canvas.height)];
  for (var i=2; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  return filter.apply(null, args);
};

Filters.tmpCanvas = document.createElement('canvas');
Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

Filters.createImageData = function(w,h) {
  return this.tmpCtx.createImageData(w,h);
};

Filters.grayscale = function(pixels, args) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};
Filters.convolute = function(pixels, weights, scale, opaque) {
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);
  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;
  // pad output by the convolution matrix
  var w = sw;
  var h = sh;
  var output = Filters.createImageData(w, h);
  var dst = output.data;
  // go through the destination image pixels
  var alphaFac = opaque ? 1 : 0;
  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      // calculate the weighed sum of the source image pixels that
      // fall under the convolution matrix
      var r=0, g=0, b=0, a=0;
      for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = sy + cy - halfSide;
          var scx = sx + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            var srcOff = (scy*sw+scx)*4;
            var wt = weights[cy*side+cx];
			wt *= scale;
            r += src[srcOff] * wt;
            g += src[srcOff+1] * wt;
            b += src[srcOff+2] * wt;
            a += src[srcOff+3] * wt;
          }
        }
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

Filters.morph = function(pixels, weights, sum, opaque) {
  var side = Math.round(Math.sqrt(weights.length));
  var halfSide = Math.floor(side/2);
  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;
  // pad output by the convolution matrix
  var w = sw;
  var h = sh;
  var output = Filters.createImageData(w, h);
  var dst = output.data;
  // go through the destination image pixels
  var alphaFac = opaque ? 1 : 0;
  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      // calculate the weighed sum of the source image pixels that
      // fall under the convolution matrix
      var r=0, g=0, b=0, a=0;
	  match = 1
      for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = sy + cy - halfSide;
          var scx = sx + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            var srcOff = (scy*sw+scx)*4;
            var wt = weights[cy*side+cx];
			if (wt == -1 && src[srcOff]) {
				match = 0
			}
			if (wt == 1 && src[srcOff] == 0) {
				match = 0
			}
          }
        }
      }
	  if (match) {
	  dst[dstOff] = 0;
      dst[dstOff+1] = 0;
      dst[dstOff+2] = 0;
      dst[dstOff+3] = src[dstOff+3];  
	  }
	  	  else {
	  dst[dstOff] = src[dstOff];
      dst[dstOff+1] = src[dstOff+1];
      dst[dstOff+2] = src[dstOff+2];
      dst[dstOff+3] = src[dstOff+3];  
	  }
    }
  }
  return output;
};

        Filters.convoluteFloat32 = function(pixels, weights, scale, opaque) {
          var side = Math.round(Math.sqrt(weights.length));
          var halfSide = Math.floor(side/2);

          var src = pixels.data;
          var sw = pixels.width;
          var sh = pixels.height;

          var w = sw;
          var h = sh;
          var output = {
            width: w, height: h, data: new Float32Array(w*h*4)
          };
          var dst = output.data;

          var alphaFac = opaque ? 1 : 0;

          for (var y=0; y<h; y++) {
            for (var x=0; x<w; x++) {
              var sy = y;
              var sx = x;
              var dstOff = (y*w+x)*4;
              var r=0, g=0, b=0, a=0;
              for (var cy=0; cy<side; cy++) {
                for (var cx=0; cx<side; cx++) {
                  var scy = Math.min(sh-1, Math.max(0, sy + cy - halfSide));
                  var scx = Math.min(sw-1, Math.max(0, sx + cx - halfSide));
                  var srcOff = (scy*sw+scx)*4;
                  var wt = weights[cy*side+cx];
				  wt *= scale;
                  r += src[srcOff] * wt;
                  g += src[srcOff+1] * wt;
                  b += src[srcOff+2] * wt;
                  a += src[srcOff+3] * wt;
                }
              }
              dst[dstOff] = r;
              dst[dstOff+1] = g;
              dst[dstOff+2] = b;
              dst[dstOff+3] = a + alphaFac*(255-a);
            }
          }
          return output;
        };
Filters.threshold = function(pixels, threshold) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};
// var c = document.getElementById('canvas');
// var ctx = c.getContext("2d");
// var imga = document.getElementById("scream");
// ctx.drawImage(imga, 0, 0);
  function runFilter(canvas, filter, img, arg1, arg2, arg3) {
	  
	  var idata = Filters.filterImage(filter, img, arg1, arg2, arg3);
	  // c.width = idata.width;
	  // c.height = idata.height;
	  // var ctx = c.getContext('2d');
	  var ctx = canvas.getContext("2d");
// ctx.scale(.2,.2)
	  ctx.putImageData(idata, 0, 0);
// ctx.scale(2,2)
// canvas.width = 150
// canvas.height = 150
	// alert(idata.height)
	  // s.display = 'none';
	  // c.style.display = 'inline';
	  // b.textContent = 'Restore original image';
  }
  function runFilterCanvas(canvas, filter, arg1, arg2, arg3) {
	  
	  var idata = Filters.filterImageCanvas(filter, canvas, arg1, arg2, arg3);
	  // c.width = idata.width;
	  // c.height = idata.height;
	  // var ctx = c.getContext('2d');
	  var ctx = canvas.getContext("2d");
// ctx.scale(.2,.2)
	  ctx.putImageData(idata, 0, 0);
// ctx.scale(2,2)
// canvas.width = 150
// canvas.height = 150
	// alert(idata.height)
	  // s.display = 'none';
	  // c.style.display = 'inline';
	  // b.textContent = 'Restore original image';
  }

      sobel = function(canvas,th) {
// canvas.width = img.width
// canvas.height = img.height

        runFilterCanvas(canvas, function(px) {
          px = Filters.grayscale(px);
// px =  Filters.convolute(px,
			// [1,1,1,
              // 1, 1, 1,
              // 1, 1, 1], 1/9, true);
			// px = Filters.convoluteFloat32(px,
            // [ 0, 0, 0, 5, 0, 0, 0,
              // 0, 5,18,32,18, 5, 0,
			  // 0,18,64,100,64,18,0,
			  // 5,32,100,100,100,32,5,
			  // 0,18,64,100,64,18,0,
			  // 0, 5,18,32,18, 5, 0,
			  // 0, 0, 0, 5, 0, 0, 0
			  // ], 1/1068);
          var vertical = Filters.convoluteFloat32(px,
            [-1,-2,-1,
              0, 0, 0,
              1, 2, 1], 1);
          var horizontal = Filters.convoluteFloat32(px,
            [-1,0,1,
             -2,0,2,
             -1,0,1], 1);
          var id = Filters.createImageData(vertical.width, vertical.height);
          for (var i=0; i<id.data.length; i+=4) {
			  var v = Math.abs(vertical.data[i]);
			              var h = Math.abs(horizontal.data[i]);
			  id.data[i] = (v+h)/2
            id.data[i+1] = (v+h)/2
            id.data[i+2] = (v+h)/2
            id.data[i+3] = 255;
            
            // id.data[i] = v;

            // id.data[i+1] = h
            // id.data[i+2] = (v+h)/4;
            // id.data[i+3] = 255;
          }
		  px = id;
// px =  Filters.convolute(px,
			// [-1,-1,-1,
              // -1, 8, -1,
              // -1, -1, -1], 1, true);
			  
px =  Filters.convolute(px,
			[1,1,1,
              1, 5, 1,
              1, 1, 1], 1/13, true);
			  
			  // px =  Filters.convolute(px,
			// [1,2,1,
              // 2, 3, 2,
              // 1, 2, 1], 1/15, true);

px= Filters.threshold(px,th);
	for (var i=0; i<parseInt(document.getElementById('thinningRange').value); i++) {
		px =  Filters.morph(px,
			[-1,-1,-1,
              0, 1, 0,
              1, 1, 1], 1, true);
		px =  Filters.morph(px,
			[ 0,-1,-1,
              1, 1,-1,
              0, 1, 0], 1, true);
		px =  Filters.morph(px,
			[ 1, 0,-1,
              1, 1,-1,
              1, 0,-1], 1, true);
		px =  Filters.morph(px,
			[ 0, 1, 0,
              1, 1,-1,
              0,-1,-1], 1, true);
		px =  Filters.morph(px,
			[ 1, 1, 1,
              0, 1, 0,
             -1,-1,-1], 1, true);
		px =  Filters.morph(px,
			[ 0, 1, 0,
             -1, 1, 1,
             -1,-1, 0], 1, true); 
		px =  Filters.morph(px,
			[-1, 0, 1,
             -1, 1, 1,
             -1, 0, 1], 1, true);
		px =  Filters.morph(px,
			[-1,-1, 0,
             -1, 1, 1,
              0, 1, 0], 1, true); 
	}
// px =  Filters.convolute(px,
			// [1,1,1,
              // 1,1,1,
              // 1, 1, 1], 9, true);
return px;

          var vertical = Filters.convoluteFloat32(px,
            [-1,-2,-1,
              0, 0, 0,
              1, 2, 1]);
          var horizontal = Filters.convoluteFloat32(px,
            [-1,0,1,
             -2,0,2,
             -1,0,1]);
          var id = Filters.createImageData(vertical.width, vertical.height);
          for (var i=0; i<id.data.length; i+=4) {
            var v = Math.abs(vertical.data[i]);
            id.data[i] = v;
            var h = Math.abs(horizontal.data[i]);
            id.data[i+1] = h
            id.data[i+2] = (v+h)/4;
            id.data[i+3] = 255;
          }
          // return id;
return Filters.threshold(id,50);
        });
      }
	  // sobel(document.getElementById('canvas'));
	  // runFilter('canvas',Filters.grayscale); 
	  
// var img = document.getElementById('canvas');
// var canvases = document.getElementsByTagName('canvas');
      // for (var i=0; i<canvases.length; i++) {
        // var c = canvases[i];
        // c.parentNode.insertBefore(img.cloneNode(true), c);
        // c.style.display = 'none';
      // }

      // function runFilter(id, filter, arg1, arg2, arg3) {
        // var c = document.getElementById(id);
        // var s = c.previousSibling.style;
        // var b = c.parentNode.getElementsByTagName('button')[0];
        // if (b.originalText == null) {
          // b.originalText = b.textContent;
        // }
        // if (s.display == 'none') {
          // s.display = 'inline';
          // c.style.display = 'none';
          // b.textContent = b.originalText;
        // } else {
          // var idata = Filters.filterImage(filter, img, arg1, arg2, arg3);
          // c.width = idata.width;
          // c.height = idata.height;
          // var ctx = c.getContext('2d');
          // ctx.putImageData(idata, 0, 0);
          // s.display = 'none';
          // c.style.display = 'inline';
          // b.textContent = 'Restore original image';
        // }
      // }
document.getElementById('thresholdInput').addEventListener( 'change', function(evt) {
          document.getElementById('thresholdRange').value=evt.target.value; 
        }, false);
document.getElementById('thinningInput').addEventListener( 'change', function(evt) {
          document.getElementById('thinningRange').value=evt.target.value; 
        }, false);
// function updateThinInput(val) {
          // document.getElementById('thinningRange').value=val; 
        // }
// ************************ Drag and drop ***************** //
let dropArea = document.getElementById("drop-area")

// Prevent default drag behaviors
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false)   
  document.body.addEventListener(eventName, preventDefaults, false)
})

// Highlight drop area when item is dragged over it
;['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false)
})

;['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false)
})

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false)

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

function highlight(e) {
  dropArea.classList.add('highlight')
}

function unhighlight(e) {
  dropArea.classList.remove('active')
}

function handleDrop(e) {
  var dt = e.dataTransfer
  var files = dt.files

  handleFiles(files)
}

function handleFiles(files) {
  files = [...files]
  // initializeProgress(files.length)
  // files.forEach(uploadFile)
  files.forEach(previewFile)
}
BORDER = 2

function calc(srcdata, weights,x,y,w,h) {
	
		var side = Math.round(Math.sqrt(weights.length));
	  var halfSide = Math.floor(side/2);
	  var sum = 0;
	    for (var cy=0; cy<side; cy++) {
        for (var cx=0; cx<side; cx++) {
          var scy = y + cy - halfSide;
          var scx = x + cx - halfSide;
		if (scy >= 0 && scy < h && scx >= 0 && scx < w && (cy != 0 || cx != 0)) {
            var srcOff = (scy*w+scx)*4;
            var wt = weights[cy*side+cx];
			sum+= srcdata[srcOff] * wt
			}
          }
        }
		return sum
}


function img_to_hideout(px) {
x_s = 160
y_s = 233
	hideout = `Language = "English"
Hideout Name = "Stately Hideout"
Hideout Hash = 31968

Stash = { Hash=3230065491, X=348, Y=325, Rot=0, Flip=0, Var=0 }
Guild Stash = { Hash=139228481, X=392, Y=325, Rot=57344, Flip=0, Var=0 }
Waypoint = { Hash=1224707366, X=222, Y=197, Rot=25666, Flip=0, Var=4 }
Crafting Bench = { Hash=2059629901, X=374, Y=286, Rot=55826, Flip=0, Var=0 }
Map Device = { Hash=2306038834, X=356, Y=287, Rot=0, Flip=0, Var=0 }
Sister Cassia = { Hash=10623884, X=237, Y=177, Rot=9672, Flip=0, Var=0 }
Navali = { Hash=693228958, X=241, Y=185, Rot=32768, Flip=0, Var=0 }
Einhar = { Hash=2684274993, X=246, Y=211, Rot=40159, Flip=0, Var=0 }
Alva = { Hash=2115859440, X=208, Y=179, Rot=19822, Flip=0, Var=0 }
Helena = { Hash=845403974, X=244, Y=204, Rot=53513, Flip=0, Var=0 }
Niko = { Hash=2906227343, X=237, Y=188, Rot=61173, Flip=0, Var=0 }
Jun = { Hash=3992724805, X=234, Y=181, Rot=2280, Flip=0, Var=0 }
Zana = { Hash=3506797600, X=243, Y=191, Rot=8992, Flip=0, Var=0 }
`
	var rotate_tiles = document.getElementById("rotate_tiles").checked;
	for (var x=BORDER; x<px.width-BORDER; x++) {
		for (var y=BORDER; y<px.height-BORDER; y++) {
			if (px.data[4*(x*px.width + y)]) {
			var rot = 62950
			if (rotate_tiles)
			{
				
				rot = 62950 - Math.floor(65536/8)
			
	// weights = [-1,0,1,
             // -2,0,2,
             // -1,0,1]
			 // gx = calc(px.data, weights, x, y,px.width,px.height)
	// weights = [-1,-2,-1,
              // 0, 0, 0,
              // 1, 2, 1] 
			 // gy = calc(px.data, weights,x ,y,px.width,px.height)
			 
			// if (gx)
			// rot += Math.floor(gy/gx * 1/4 * 65536) + 65536
			// rot %= 65536
			
			}
	// var side = Math.round(Math.sqrt(weights.length));
	  // var halfSide = Math.floor(side/2);
	  // var angle = 0;
	  // var values = 0;
	    // for (var cy=0; cy<side; cy++) {
        // for (var cx=0; cx<side; cx++) {
          // var scy = y + cy - halfSide;
          // var scx = x + cx - halfSide;
		// if (scy >= 0 && scy < px.height && scx >= 0 && scx < px.width && (cy != 0 || cx != 0)) {
            // var srcOff = (scy*px.width+scx)*4;
            // var wt = weights[cy*side+cx];
			// if (px.data[srcOff]) {
			// angle += wt;
			// values++;
			// }
          // }
        // }
      // }
	  
		// angle /= values
		// if (values)
			// rot += Math.floor(angle / 2 * 65536) + 65536
			// rot %= 65536
			// }
	  
                // if slopes:
                    // rot = int(mean(slopes)*MAXROT)
                // rot = (rot + 62950) % MAXROT
                // if not rotate:
                    // rot = 62950
			// hx = (x_s + x*2)
			// hy = (y_s + y*2)
			hx = (x_s + y*2)
			hy = (y_s + px.height*2 - x*2)
            // hideout += 'Primeval Debris = { Hash=2706854561, X=' + hx +', Y=' + hy + ', Rot=' + rot + ', Flip=0, Var=4 }\n'
			
			hideout += 'Primeval Debris = { Hash=2706854561, X=' + hx +', Y=' + hy + ', Rot=' + rot + ', Flip=0, Var=4 }\n'
			
			}
			// hideout += px.data[4*(x*px.width + y)]
	}}
	// for (var i=0; i<px.data.length; i+=4) {
		// if (px.data[i]) {
			// count++;
		// }
	return hideout
	
	
}
HIDEOUT_WIDTH = 56
HIDEOUT_HEIGHT = 56
function previewFile(file) {
  let reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onloadend = function() {
	let row = document.createElement('div')
    let img = document.createElement('img')
	let res = document.createElement('canvas')
	let dl = document.createElement('button')
	dl.innerHTML = "Download hideout"
	row.style.display = 'none';
    // img.src = reader.result
	

	// let ctx = res.getContext("2d")
	var imga = new Image;
	// imga.onload = function(){
		// new thumbnailer(res, imga, 150, 3);
	// };
	// imga.src = reader.result;
	
// img.style.width="56px";
	imga.onload = function(){
		res.width=HIDEOUT_WIDTH;
		res.height=HIDEOUT_HEIGHT;
		
		// Filters.tmpCanvas = document.createElement('canvas');
// Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

// Filters.createImageData = function(w,h) {
  // return this.tmpCtx.createImageData(w,h);
// }; 
		oCanvas = document.createElement('canvas');

		// alert(imga.width)
		let fast_resize =document.getElementById("fast_resize").checked
		if (!fast_resize && (imga.width > HIDEOUT_WIDTH || imga.height > HIDEOUT_HEIGHT)) {
			if (imga.height > imga.width)
				new thumbnailer(oCanvas, imga, parseInt(HIDEOUT_HEIGHT/imga.height*imga.width), 3)
			else
				new thumbnailer(oCanvas, imga, HIDEOUT_WIDTH, 3)
		} 
		else 
		{
			let tmpCtx = oCanvas.getContext("2d")
			if (imga.height > imga.width) {
				rw = parseInt(HIDEOUT_HEIGHT/imga.height*imga.width)
				rh = HIDEOUT_HEIGHT
				oCanvas.width = rw
				oCanvas.height = rh
				tmpCtx.drawImage(imga,0,0,rw,rh); // Or at whatever offset you like
			}
			else
			{
				rw = HIDEOUT_WIDTH
				rh = parseInt(HIDEOUT_WIDTH/imga.width*imga.height)
				oCanvas.width = rw
				oCanvas.height = rh
				tmpCtx.drawImage(imga,0,0,rw,rh)
			}
		}
		
		let tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = oCanvas.width;
		tmpCanvas.height = oCanvas.height;
		// alert('thumb');
		// alert(tmpCanvas.width)
		ax = Math.floor((res.width - tmpCanvas.width) /2)
		ay = Math.floor((res.height - tmpCanvas.height) /2)
		// return;
		var th=parseInt(document.getElementById("thresholdRange").value);
		var count = 751;
		let ctx = tmpCanvas.getContext("2d")
		while (count > 750 && th <245) {
			ctx.drawImage(oCanvas,0,0)
			// ctx.drawImage(img,0,0,56,56); // Or at whatever offset you like
			sobel(tmpCanvas,th)
			// var px = ctx.getImageData(0,0,res.width,res.height)
			var px = ctx.getImageData(0,0,oCanvas.width,oCanvas.height)
			count = 0
			for (var x=BORDER; x<px.width-BORDER; x++) {
			for (var y=BORDER; y<px.height-BORDER; y++) {
			if (px.data[4*(x*px.width + y)]) {
				count++;
			}}}
			// for (var i=0; i<px.data.length; i+=4) {
				// if (px.data[i]) {
					// count++;
				// }
		// }
		th+=5;
		}
		let rctx = res.getContext("2d")
		rctx.rect(0,0,rctx.canvas.width,rctx.canvas.height)
		rctx.fillStyle = 'black'
		rctx.fill()
		rctx.drawImage(tmpCanvas,ax,ay)
		// row.appendChild(tmpCanvas)
		dl.innerHTML = th;
		row.style.display = 'block';
		
		dl.onclick = function(){ download("hello.hideout",img_to_hideout(rctx.getImageData(0,0,res.width,res.height)))}
		// alert(th)
		// new thumbnailer(res, img, 150, 3);
	};
	// var imga = new Image;
	// imga.onload = function(){
		// sobel(res,imga)
	// };
	// imga.src = reader.result;

	// sobel(res)
      // imgp = new Image();                         // create a temp. image object
    
    // imgp.onload = function() {                    // handle async image loading
      // URL.revokeObjectURL(this.src);             // free memory held by Object URL
      // res.getContext("2d").drawImage(this, 0, 0);  // draw image onto canvas (lazy method™)
    // };

	// let ctx = res.getContext("2d")
	// ctx.drawImage(reader.result, 0, 0)
	
	// res.width=150;
	img.src = reader.result;

	imga.src = reader.result;

	row.appendChild(img)
	row.appendChild(res)
	row.appendChild(dl)
    document.getElementById('gallery').prepend(row)
  }
}
function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// returns a function that calculates lanczos weight
function lanczosCreate(lobes) {
    return function(x) {
        if (x > lobes)
            return 0;
        x *= Math.PI;
        if (Math.abs(x) < 1e-16)
            return 1;
        var xx = x / lobes;
        return Math.sin(x) * Math.sin(xx) / x / xx;
    };
}

// elem: canvas element, img: image element, sx: scaled width, lobes: kernel radius
function thumbnailer(elem, img, sx, lobes) {
    this.canvas = elem;
    elem.width = img.width;
    elem.height = img.height;
    elem.style.display = "none";
    this.ctx = elem.getContext("2d");
    this.ctx.drawImage(img, 0, 0);
    this.img = img;
    this.src = this.ctx.getImageData(0, 0, img.width, img.height);
    this.dest = {
        width : sx,
        height : Math.round(img.height * sx / img.width),
    };
    this.dest.data = new Array(this.dest.width * this.dest.height * 3);
    this.lanczos = lanczosCreate(lobes);
    this.ratio = img.width / sx;
    this.rcp_ratio = 2 / this.ratio;
    this.range2 = Math.ceil(this.ratio * lobes / 2);
    this.cacheLanc = {};
    this.center = {};
    this.icenter = {};
    setTimeout(this.process1, 0, this, 0);
}

function thumbnailer(elem, img, sx, lobes) {
    this.canvas = elem;
    elem.width = img.width;
    elem.height = img.height;
    elem.style.display = "none";
    this.ctx = elem.getContext("2d");
    this.ctx.drawImage(img, 0, 0);
    this.img = img;
    this.src = this.ctx.getImageData(0, 0, img.width, img.height);
    this.dest = {
        width : sx,
        height : Math.round(img.height * sx / img.width),
    };
    this.dest.data = new Array(this.dest.width * this.dest.height * 3);
    this.lanczos = lanczosCreate(lobes);
    this.ratio = img.width / sx;
    this.rcp_ratio = 2 / this.ratio;
    this.range2 = Math.ceil(this.ratio * lobes / 2);
    this.cacheLanc = {};
    this.center = {};
    this.icenter = {};
    // setTimeout(this.process1, 0, this, 0);
	this.process1(this,0)
}

thumbnailer.prototype.process1 = function(self, u) {
    self.center.x = (u + 0.5) * self.ratio;
    self.icenter.x = Math.floor(self.center.x);
    for (var v = 0; v < self.dest.height; v++) {
        self.center.y = (v + 0.5) * self.ratio;
        self.icenter.y = Math.floor(self.center.y);
        var a, r, g, b;
        a = r = g = b = 0;
        for (var i = self.icenter.x - self.range2; i <= self.icenter.x + self.range2; i++) {
            if (i < 0 || i >= self.src.width)
                continue;
            var f_x = Math.floor(1000 * Math.abs(i - self.center.x));
            if (!self.cacheLanc[f_x])
                self.cacheLanc[f_x] = {};
            for (var j = self.icenter.y - self.range2; j <= self.icenter.y + self.range2; j++) {
                if (j < 0 || j >= self.src.height)
                    continue;
                var f_y = Math.floor(1000 * Math.abs(j - self.center.y));
                if (self.cacheLanc[f_x][f_y] == undefined)
                    self.cacheLanc[f_x][f_y] = self.lanczos(Math.sqrt(Math.pow(f_x * self.rcp_ratio, 2)
                            + Math.pow(f_y * self.rcp_ratio, 2)) / 1000);
                weight = self.cacheLanc[f_x][f_y];
                if (weight > 0) {
                    var idx = (j * self.src.width + i) * 4;
                    a += weight;
                    r += weight * self.src.data[idx];
                    g += weight * self.src.data[idx + 1];
                    b += weight * self.src.data[idx + 2];
                }
            }
        }
        var idx = (v * self.dest.width + u) * 3;
        self.dest.data[idx] = r / a;
        self.dest.data[idx + 1] = g / a;
        self.dest.data[idx + 2] = b / a;
    }

    if (++u < self.dest.width)
        // setTimeout(self.process1, 0, self, u);
	self.process1(self,u)
    else
        // setTimeout(self.process2, 0, self);
	self.process2(self)
};
thumbnailer.prototype.process2 = function(self) {
    self.canvas.width = self.dest.width;
    self.canvas.height = self.dest.height;
    self.ctx.drawImage(self.img, 0, 0, self.dest.width, self.dest.height);
    self.src = self.ctx.getImageData(0, 0, self.dest.width, self.dest.height);
    var idx, idx2;
    for (var i = 0; i < self.dest.width; i++) {
        for (var j = 0; j < self.dest.height; j++) {
            idx = (j * self.dest.width + i) * 3;
            idx2 = (j * self.dest.width + i) * 4;
            self.src.data[idx2] = self.dest.data[idx];
            self.src.data[idx2 + 1] = self.dest.data[idx + 1];
            self.src.data[idx2 + 2] = self.dest.data[idx + 2];
        }
    }
    self.ctx.putImageData(self.src, 0, 0);
    self.canvas.style.display = "block";
};