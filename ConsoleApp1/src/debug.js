"use strict";

let debugImages = [];
//let debugImages = ["snapshot"];
//let debugImages = ["finder", "perspectivecorrected1", "sampling", "snapshot"];

class DebugImage {
  static image(name) {
    return DebugImage.fromBitmap(name, DebugImage.baseBitmap);
  }

  static fromSize(name, x, y) {
    if (name in DebugImage.images) {
      return DebugImage.images[name];
    }
    
    if (debugImages.indexOf(name) < 0) {
      return new DebugImage(name, false);
    }

    let data = new Uint8ClampedArray(x * y * 4);
    for (let o = 0; o < data.length; o += 4) {
      data[o] = 255;
      data[o+1] = 255;
      data[o+2] = 255;
      data[o+3] = 255;  // alpha
    }
    
    return new DebugImage(name, true, new Bitmap(data, x, y, 4));
  }
  
  static fromBitmap(name, bitmap) {
    if (name in DebugImage.images) {
      return DebugImage.images[name];
    }
    
    if (debugImages.indexOf(name) < 0) {
      return new DebugImage(name, false);
    }

    if (bitmap.pitch === 4) {
      return new DebugImage(name, true, bitmap.clone());
    }
    
    let data = new Uint8ClampedArray(bitmap.data.length * 4);
    for (let i = 0, o = 0; i < bitmap.data.length; i++, o += 4) {
      data[o] = bitmap.data[i];
      data[o+1] = bitmap.data[i];
      data[o+2] = bitmap.data[i];
      data[o+3] = 255;  // alpha
    }
    return new DebugImage(name, true, new Bitmap(data, bitmap.width, bitmap.height, 4));
  }
  
  static clear() {
    for (let name in DebugImage.images) {
      if (DebugImage.images[name].enabled) {
        DebugImage.images[name].canvas.remove();
      }
    }
    DebugImage.images = {};
  }
  
  constructor(name, enabled, bitmap) {
    this.name = name;
    this.enabled = enabled;
    this.bitmap = bitmap;
    DebugImage.images[name] = this;
  }
  
  async draw() {
    if (!this.enabled) {
      return;
    }
    
    let elementId = "debug_canvas_" + this.name;
    let canvas = document.getElementById(elementId);
    if (canvas === null) {
      let parent = document.getElementById("debug_canvases");
      canvas = document.createElement("canvas");
      canvas.setAttribute("id", elementId);
      canvas.style.imageRendering = "pixelated";
      parent.appendChild(canvas);
      
      canvas.addEventListener("contextmenu", ev => {
        console.log("Coordinates on " + this.name + ": x=" + ev.offsetX + ", y=" + ev.offsetY);
        ev.preventDefault();
        return false;
      });
    }
    
    canvas.width = this.bitmap.width;
    canvas.height = this.bitmap.height;
    this.canvas = canvas;
    
    let imagedata = new ImageData(this.bitmap.data, this.bitmap.width, this.bitmap.height);
    let imagebitmap = await createImageBitmap(imagedata);
    let context = canvas.getContext("2d");
    context.drawImage(imagebitmap, 0, 0);
  }
  
  dot(x, y, r, g, b, size) {
    if (!this.enabled) {
      return;
    }
    
    x = Math.round(x);
    y = Math.round(y);
    if (size === undefined) {
      size = 2;
    }
    
    for (let xi = x - size; xi <= x + size; xi++) {
      for (let yi = y - size; yi <= y + size; yi++) {
        if (yi >= 0 && yi < this.bitmap.height && xi >= 0 && xi < this.bitmap.width) {
          this.bitmap.putColor(xi, yi, r, g, b);
        }
      }
    }
  }

  parametricLine(l, rc, gc, bc) {
    if (!this.enabled) {
      return;
    }
    
    // ax+by =c; y = (c-ax)/b; x = (c-by)/a;
    let a = {x: 0, y: l.c/l.b};
    if (a.y < 0) {
      a = {x: l.c/l.a, y: 0};
    } else if (a.y >= this.bitmap.height) {
      a.y = this.bitmap.height - 1;
      a.x = (l.c - l.b * a.y) / l.a;
    }
    
    let b = {x: this.bitmap.width - 1};
    b.y = (l.c - l.a * b.x)/l.b;
    if (b.y < 0) {
      b = {x: l.c/l.a, y:0};
    } else if (b.y >= this.bitmap.height) {
      b.y = this.bitmap.height - 1;
      b.x = (l.c - l.b * b.y) / l.a;
    }
    
    this.line(a, b, rc, gc, bc);
  }
  
  line(a, b, rc, gc, bc) {
    if (!this.enabled) {
      return;
    }
    
    let len = Math.sqrt(a.squareDistance(b));
    let dx = Math.abs(a.x - b.x);
    let dy = Math.abs(a.y - b.y);
    let steps = Math.max(dx, dy);
    
    let delta = b.subtract(a);
    for (let i = 0; i <= steps; i++) {
      let ratio = i/steps;
      let mid = a.scale(ratio).add(b.scale(1-ratio));
      this.bitmap.putColor(Math.round(mid.x), Math.round(mid.y), rc, gc, bc);
    }
  }

  static setBaseBitmap(bitmap) {
    DebugImage.baseBitmap = bitmap;
  }
}

DebugImage.images = {};

class Debug {
  static load(name) {
    let url = "images/" + name;
    if (name.indexOf(".") < 0) {
      url = url + ".png";
    }
    
    let image = new Image();
    image.src = url;
    image.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      let context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, image.width, image.height);
      let imageData = context.getImageData(0, 0, image.width, image.height);
      origImage = new Bitmap(imageData.data, image.width, image.height, 4);
      DebugImage.clear();
      DebugImage.setBaseBitmap(origImage);
      let debug = DebugImage.fromBitmap("snapshot", origImage);
      debug.draw();
    };
  }
  
  static async save() {
    let canvas = document.createElement("canvas");
    canvas.width = origImage.width;
    canvas.height = origImage.height;
    let context = canvas.getContext("2d");
    let imagedata = new ImageData(origImage.data, origImage.width, origImage.height);
    let imagebitmap = await createImageBitmap(imagedata);
    context.drawImage(imagebitmap, 0, 0);
    window.open(canvas.toDataURL("image/png"), "_blank");
  }
  
  static init() {
    window.addEventListener("keypress", ev => {
      switch (ev.key) {
      case "s":
        Debug.save();
      }
    });
  }
  
  static process() {
    DebugImage.clear();
    DebugImage.setBaseBitmap(origImage);
    let debug = DebugImage.image("snapshot");
    debug.draw();
    QRReader.process(origImage);
  }
}

function assert(cond, msg) {
  if (!cond) {
    throw "Assertion failed: " + msg;
  }
}

// BELOW: Random little functions that ended up being useful during debugging
function bbcDecode() {
  let sent = Poly.create(GF16,  [12, 12,  3,  3, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1]);
  let error = Poly.create(GF16, [ 0,  0,  2,  0,  0,  0,  0,  0,  0,  9,  0,  0,  0,  0,  0]);
  let received = sent.add(error);
  RSCodec.decode(received, 15, 4);
}

function bbcDecode2() {
  let sent = Poly.create(GF16,  [12, 12,  3,  3, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1]);
  let error = Poly.create(GF16, [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  9,  0,  0,  0,  0,  0]);
  let received = sent.add(error);
  RSCodec.decode(received, 15, 4);
}

function bbcDecode3() {
  let sent = Poly.create(GF16,  [12, 12,  3,  3, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1]);
  let error = Poly.create(GF16, [ 0,  0,  2,  0,  0,  0,  0,  0,  0,  7,  0,  0,  0,  0,  0]);
  let received = sent.add(error);
  RSCodec.decode(received, 15, 4);
}

function bbcDecode4() {
  let sent = Poly.create(GF16,  [12, 12,  3,  3, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1]);
  let error = Poly.create(GF16, [ 0,  0,  0,  0,  0,  0, 14,  0,  0,  0,  6,  0,  0,  0,  0]);
  let received = sent.add(error);
  RSCodec.decode(received, 15, 4);
}

function bbcEncode() {
  let message = Poly.create(GF16, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  let generator = RSCodec.generatorPolynomial(GF16, 4, 0);
  console.log("Generator:");
  console.log(generator);
  let codeword = RSCodec.encode(message, generator);
  console.log("Codeword:");
  console.log(codeword);
}

function thonkyEncode() {
  let message = Poly.create(GF256, [17, 236, 17, 236, 17, 236, 64, 67, 77, 220, 114, 209, 120, 11, 91, 32]);
  let generator = RSCodec.generatorPolynomial(GF256, 5, 0);
  console.log("Message:");
  console.log(message);
  console.log("Generator:");
  console.log(generator);
  let codeword = RSCodec.encode(message, generator);
  console.log("Codeword:");
  console.log(codeword);
  
  RSCodec.decode(codeword, 16, 5);
}

// Since the math is beyond me, I use the good old method of fuzz testing to figure out if the
// codec works or not. Seems to. Tested with 10000 messages over GF(256) with 150 message symbols,
// 100 error correction symbols and 50 errors and a few other interesting combinations.
function decodeTestLoop() {
  for (let i = 0; i < 1000; i++) {
    if (i % 100 === 0) {
      console.log(i + " messages tested...")
    }
    if (!decodeTest(GF256, 40, 200, 100)) {
      return;
    }
  }
  console.log("All OK");
}

function decodeTest(field, n, k, errors) {
  let randInt = x => Math.floor(Math.random() * x);
  let message = [];
  for (let i = 0; i < n; i++) {
    message.push(randInt(field.size()));
  }
  
  let messagePoly = Poly.create(field, message);
  let generatorPoly = RSCodec.generatorPolynomial(field, k, 0);
  let sentPoly = RSCodec.encode(messagePoly, generatorPoly);
  
  let error = new Array(n + k).fill(0);
  for (let i = 0; i < errors; i++) {
    error[randInt(n + k)] = randInt(field.size());
  }
  
  let errorPoly = Poly.create(field, error);
  let receivedPoly = sentPoly.add(errorPoly);
  let decodedPoly = RSCodec.decode(receivedPoly, n, k);
  if (decodedPoly.eq(messagePoly)) {
    return true;
  }
  
  console.log("BAD:");
  console.log("Message:");
  console.log(messagePoly);
  console.log("Sent:");
  console.log(sentPoly);
  console.log("Error:");
  console.log(errorPoly);
  console.log("Decoded:");
  console.log(decodedPoly);
  return false;
}
