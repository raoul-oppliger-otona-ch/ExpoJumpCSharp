"use strict";

// A dumb little abstraction of a bitmap.
class Bitmap {
  constructor(data, width, height, pitch) {
    this.width = width;
    this.height = height;
    this.pitch = pitch;
    this.data = data;
  }
  
  getPixel(x, y) {
    return this.data[(y * this.width + x) * this.pitch];
  }
  
  putPixel(x, y, v) {
    this.data[(y * this.width + x) * this.pitch] = v;
  }
  
  putColor(x, y, r, g, b) {
    let offset = (y * this.width + x) * this.pitch;
    this.data[offset + 0] = r;
    this.data[offset + 1] = g;
    this.data[offset + 2] = b;
    this.data[offset + 3] = 255;
  }
  
  clone() {
    let data2 = new Uint8ClampedArray(this.data.length);
    data2.set(this.data, 0);
    return new Bitmap(data2, this.width, this.height, this.pitch);
  }
}

// 2-D vector
class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  squareDistance(a) {
    return (a.x - this.x) * (a.x - this.x) + (a.y - this.y) * (a.y - this.y);
  }

  add(a) {
    return new Vec(this.x + a.x, this.y + a.y);
  }
  
  subtract(a) {
    return new Vec(this.x - a.x, this.y - a.y);
  }
  
  scale(c) {
    return new Vec(this.x * c, this.y * c);
  }
  
  normalize() {
    let length = Math.sqrt(this.x * this.x + this.y * this.y);
    return new Vec(this.x / length, this.y / length);
  }
}

class Geom {
  static dotProductNormalized(a, b) {
    let aLength = Math.sqrt(a.x * a.x + a.y * a.y);
    let bLength = Math.sqrt(b.x * b.x + b.y * b.y);
    return (a.x * b.x + a.y * b.y) / (aLength * bLength);
  }

  // Find the intersection of two parametric lines ax+by = c
  static intersectParametricLines(l1, l2) {
    let det = l1.a * l2.b - l2.a * l1.b;
    let x = l1.c * l2.b - l2.c * l1.b;
    let y = -l1.c * l2.a + l2.c * l1.a;
    return new Vec(x/det, y/det);
  }
  
  // Finds the intersection of lines spanned by points (p1,p2) and (p3,p4)
  static intersectLines(p1, p2, p3, p4) {
    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    let x1y2 = p1.x * p2.y - p1.y * p2.x;
    let x3y4 = p3.x * p4.y - p3.y * p4.x;
    
    let x = (x1y2 * (p3.x - p4.x) - (p1.x - p2.x) * x3y4) / denominator;
    let y = (x1y2 * (p3.y - p4.y) - (p1.y - p2.y) * x3y4) / denominator;
    let result = new Vec(x, y);
    
    // let c1 = dotProductNormalized(subtract(p2, p1), subtract(result, p1));
    // let c2 = dotProductNormalized(subtract(p4, p3), subtract(result, p3));
    
    // console.log("dot products: " + c1 + " " + c2);
    // debugDot(input, result.x, result.y, 255, 0, 255);
  
    return result;
  }

  static linePointDistance(l, p) {
    return Math.abs((l.a * p.x + l.b * p.y - l.c)) / Math.sqrt(l.a * l.a + l.b * l.b);
  }
  
  // The cosine of the angle between the two lines
  static lineCosAngle(l1, l2) {
    let denominator = Math.sqrt((l1.a*l1.a + l1.b * l1.b) * (l2.a*l2.a + l2.b*l2.b));
    
    return (l1.a * l2.a + l1.b * l2.b) / denominator;
  }
  
  // Cosine of the angle between a->b and a->c
  static vectorCosAngle(a, b, c) {
    let a2b = b.subtract(a).normalize();
    let a2c = c.subtract(a).normalize();
    return a2b.x * a2c.x + a2b.y * a2c.y;
  }
  
  // Is a->b clockwise of a->c?
  static isClockwise(a, b, c) {
    let a2b = b.subtract(a);
    let a2c = c.subtract(a);
    return (a2c.x * a2b.y - a2c.y * a2b.x) > 0;
  }
  
  static lineFittingError(l, points, discard) {
    let errors = [];
    for (let  i = 0; i < points.length; i++) {
      errors.push({index: i, error: Math.abs(l.a*points[i].x + l.b*points[i].y - l.c)});
    }
    
    errors.sort((a, b) => { return b.error - a.error});
    return errors;
  }
  
  static processLineFittingErrors(line, errors, discard) {
    let vec = Math.sqrt(line.a * line.a + line.b * line.b);
    let maxError = errors[discard].error;
    let avgError = errors.slice(discard).map(e => e.error).reduce((a, b) => a+b) / (errors.length - discard);
    return {max: maxError / vec, avg: avgError / vec};
  }
  
  // This version of least squares works even if the best fit line is very close to either
  // axis. Source:
  // https://www.engr.colostate.edu/~dga/dga/papers/least_squares.pdf
  // Returns a, b, and c for ax + by = c
  static fitLine(points, discard) {
    let sum = new Vec(0, 0);
    for (let p of points) {
      sum = sum.add(p);
    }
    
    let avg = sum.scale(1/points.length);
  
    let xps = [];
    let ap = 0;
    let bp = 0;
    for (let p of points) {
      let xp = p.subtract(avg);
      xps.push(xp);
      ap += xp.x * xp.x - xp.y * xp.y;
      bp += xp.x * xp.y;
    }
    
    if (Math.abs(bp) < 0.0001) {
      // The best fit line is horizontal or vertical.
      // TODO(lberki): Do something intelligent here
      console.log("BAD BEST FIT");
    }
    
    let a = 2 * bp;
    let b =  -(ap + Math.sqrt(ap * ap + 4 * bp * bp));
    let c = a * avg.x + b * avg.y;
    let len = Math.sqrt(a*a + b*b);
  
    if (discard === 0) {
      return {a: a, b: b, c: c, points: points};
    }
    
    // Remove outliers, that is, the points with the top errors, then try again
    let errors = Geom.lineFittingError({a: a, b: b, c: c}, points);
    
    let newPoints = [];
    for (let i = discard; i < errors.length; i++) {
      newPoints.push(points[errors[i].index]);
    }
  
    return Geom.fitLine(newPoints, 0);
  }
  
}


