"use strict";

// Perspective correction implemented using a square to arbitrary quadrilateral transformation.
// Based on this paper:
// http://graphics.cs.cmu.edu/courses/15-463/2010_fall/Papers/proj.pdf

class PerspectiveBitmap {
  constructor(base, thresholdMap, width, height, transform) {
    this.base = base;
    this.thresholdMap = thresholdMap;
    this.width = width;
    this.height = height;
    this.transform = transform;
  }

  getPixel(x, y) {
    let uv = this.transform.apply({x: x / this.width, y: y / this.height});
    let floor = new Vec(Math.floor(uv.x), Math.floor(uv.y));
    let ceil = new Vec(Math.ceil(uv.x), Math.ceil(uv.y));
    let fraction = uv.subtract(floor);
    let tl = this.base.getPixel(floor.x, floor.y);
    let tr = this.base.getPixel(ceil.x, floor.y);
    let bl = this.base.getPixel(floor.x, ceil.y);
    let br = this.base.getPixel(ceil.x, ceil.y);
    
    let vt = tl * (1-fraction.x) + tr * fraction.x;
    let vb = bl * (1-fraction.x) + br * fraction.x;
    let v = vt * (1-fraction.y) + vb * fraction.y;
    return v < this.thresholdMap.getPixel(Math.round(uv.x), Math.round(uv.y)) ? 0 : 255;
    // return this.base.getPixel(Math.round(uv.x), Math.round(uv.y));
  }
  
  putPixel(x, y, v) {
    throw "unsupported";
  }
  
  putColor() {
    throw "unsupported";
  }
  
  clone() {
    throw "unsupported";
  }
}


// a11: a
// a21: b
// a31: c
// a12: d
// a22: e
// a32: f
// a13: g
// a23: h
// a33: i

// adjoint:
//
//
// a = a11: this.a22 * this.a33 - this.a23 * this.a32 = e*i - h*f
// b = a21: this.a23 * this.a31 - this.a21 * this.a33 = h*c - b*i
// c = a31: this.a21 * this.a32 - this.a22 * this.a31 = b*f - e*c
// d = a12: this.a13 * this.a32 - this.a12 * this.a33 = g*f - d*i
// e = a22: this.a11 * this.a33 - this.a13 * this.a31 = a*i - g*c
// f = a32: this.a12 * this.a31 - this.a11 * this.a32 = d*c - a*f
// g = a13: this.a12 * this.a23 - this.a13 * this.a22 = d*h - g*e
// h = a23: this.a13 * this.a21 - this.a11 * this.a23 = g*b - a*h
// i = a33: this.a11 * this.a22 - this.a12 * this.a21 = a*e - d*b

class Perspective {
  constructor(a, b, c, d, e, f, g, h, i) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    this.g = g;
    this.h = h;
    this.i = i;
  }
  
  apply(p) {
    let denominator = this.g*p.x + this.h*p.y + this.i;
    return new Vec(
      (this.a*p.x + this.b*p.y + this.c) / denominator,
      (this.d*p.x + this.e*p.y + this.f) / denominator
    );
  }

  inverse() {
    let [a,b,c,d,e,f,g,h,i] = [this.a, this.b, this.c, this.d, this.e, this.f, this.g, this.h, this.i];
    let ra = e*i - h*f;
    let rb = h*c - b*i;
    let rc = b*f - e*c;
    let rd = g*f - d*i;
    let re = a*i - g*c;
    let rf = d*c - a*f;
    let rg = d*h - g*e;
    let rh = g*b - a*h;
    let ri = a*e - d*b;
    return new Perspective(ra, rb, rc, rd, re, rf, rg, rh, ri);
  }
  
  // x0: TL (0, 0) x1: TR (1, 0) x2: BR (1, 1) x3: BL (0, 1)
  static squareToQuadrilateral(tl, tr, bl, br) {
    let EPSILON = 0.0001;
    let [x0, y0, x1, y1, x2, y2, x3, y3] = [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y];

    let dx1 = x1 - x2;
    let dx2 = x3 - x2;
    let dy1 = y1 - y2;
    let dy2 = y3 - y2;
    let sx2 = x3 - x2;
    let sx = x0 - x1 + x2 - x3;
    let sy = y0 - y1 + y2 - y3;
    
    if (Math.abs(sx) < EPSILON && Math.abs(sy) < EPSILON) {
      // This is an affine transformation
      return new Perspective(x1-x0, x2-x1, x0, y1-y0, y2-y1, y0, 0, 0, 1.0);
    }
    
    let denominator = dx1*dy2 - dx2*dy1;
    let g = (sx*dy2 - dx2*sy)  / denominator;
    let h  = (dx1*sy - sx*dy1) / denominator;
    
    return new Perspective(
        x1 - x0 + g*x1,
        x3 - x0 + h*x3,
        x0,
        y1 - y0 + g*y1,
        y3 - y0 + h*y3,
        y0,
        g,
        h,
        1.0);
  }
}