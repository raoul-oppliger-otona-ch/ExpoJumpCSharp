"use strict";

class PatternVerifier {
  static findAllFinderPatternEdges(bitmap, center) {
    let finderEdgeRunPredicate = (runs) => {
      let REGION_RATIO_THRESHOLD = 2;
      if (runs[0] < 1 || runs[1] < 1 || runs[2] < 1) {
        return false;
        
      }
      if ((runs[1]+1) / runs[2] < 1 / REGION_RATIO_THRESHOLD ||
          (runs[1]-1) / runs[2] > REGION_RATIO_THRESHOLD) {
        return false;
      }
      
      return true;
    };
    
    let lines = [];
    let directions = [new Vec(-1, -1), new Vec(1, -1), new Vec(1, 1), new Vec(-1, 1)];
    
    // Find the quadrants of the finder pattern. By my caprice, three quadrants out of four must be
    // identifiable. And also because that's the smallest number that is guaranteed to contain
    // ever corner.
    let okQuadrants = 0;
    for (let dir of directions) {
      let quadrantFit = PatternVerifier.fitQuadrant(bitmap, center, 3, finderEdgeRunPredicate, dir);
      if (quadrantFit === null) {
        continue;
      }
      
      lines = lines.concat(quadrantFit);
      okQuadrants++;
    }
    
    if (okQuadrants < 3) {
      return null;
    }
    
    let sides = [];
    let currentSide = [];
    let lastLine = null;
    let firstLine = null;
    let THRESHOLD = Math.cos(20 * Math.PI / 180);
    
    for (let line of lines) {
      if (lastLine === null) {
        firstLine = line;
        currentSide = currentSide.concat(line.points);
      } else {
        if (Math.abs(Geom.lineCosAngle(line, lastLine)) > THRESHOLD) {
          currentSide = currentSide.concat(line.points);
        } else {
          sides.push(currentSide);
          currentSide = line.points;
        }
      }
      lastLine = line;
    }
    
    if (sides.length > 0 && Math.abs(Geom.lineCosAngle(lastLine, firstLine)) > THRESHOLD) {
      sides[0] = sides[0].concat(currentSide);
    } else {
      sides.push(currentSide);
    }
    
    if (sides.length !== 4) {
      return null;
    }
  
    let sideLines = [];
    for (let side of sides) {
      if (side.length < 4) {
        continue;
      }
      
      let discard = Math.floor(side.length * 0.25);
      let line = Geom.fitLine(side, discard);
      let errors = Geom.processLineFittingErrors(line, Geom.lineFittingError(line, side), discard);
      if (errors.max > 1.5 || errors.avg > 1) {
        continue;
      }
      
      sideLines.push(line);
      // debugLineParametric(input, line, 255, 0, 255);
    }
    
    // for (let p of sides[0]) {
    //   debugDot(input, p.x, p.y, 255, 0, 0);
    // }
    // for (let p of sides[1]) {
    //   debugDot(input, p.x, p.y, 0, 255, 0);
    // }
    // for (let p of sides[2]) {
    //   debugDot(input, p.x, p.y, 0, 0, 255);
    // }
    // for (let p of sides[3]) {
    //   debugDot(input, p.x, p.y, 255, 255, 0);
    // }
    
    if (sideLines.length !== 4) {
      return null;
    }
    
    let ANGLE_THRESHOLD = Math.cos(15 * Math.PI / 180);
    if (Math.abs(Geom.lineCosAngle(sideLines[0], sideLines[2])) < ANGLE_THRESHOLD) {
      return null;
    }
    
    if (Math.abs(Geom.lineCosAngle(sideLines[1], sideLines[3])) < ANGLE_THRESHOLD) {
      return null;
    }
    
    let corners=[];
    for (let i = 0; i < 4; i++) {
      let corner = Geom.intersectParametricLines(sideLines[i], sideLines[(i+1) % 4]);
      corners.push(corner);
    }
    
    let computedCenter = new Vec(
      (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
      (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4);
    
    console.log("Found finder pattern, x=" + computedCenter.x + ", y=" + computedCenter.y +
        " input: x=" + center.x + ", y=" + center.y);
    return { lines: sideLines, corners: corners, center: computedCenter };
  }
  
  // Try to find a quadrant of a finder pattern
  static fitQuadrant(bitmap, center, runCount, runPredicate, quadrant) {
    let POINTS = 30;
    let DISCARD_RATIO = 0.25;
    let ACCEPTABLE_DISTANCE = 2;
    
    let maximumSize = (bitmap.width + bitmap.height) / 10;
    // First, cast a few lines through a "dark/light/dark" pattern
    let points = PatternVerifier.castLinesToQuadrant(
      bitmap, center, runCount, runPredicate, quadrant, POINTS, maximumSize);
    
    for (let p of points) {
      // debugDot(input, p.x, p.y, 255, 0, 255);
    }
    
    if (points.length < POINTS*2/3) {
      // Ray casting failed miserably. Give up.
      return null;
    }
  
    let discard = Math.round(points.length * DISCARD_RATIO);
  
    // First try to fit a single line, in case the pattern is rotated exactly 45 degrees
    let singleLine = Geom.fitLine(points, discard);
    let singleLineErrors = Geom.processLineFittingErrors(
        singleLine, Geom.lineFittingError(singleLine, points), discard);
    let singleLineError = singleLineErrors.max < ACCEPTABLE_DISTANCE
        ? singleLineErrors.avg : Number.MAX_VALUE;
  
    let minError = Number.MAX_VALUE, minIndex = -1;
    let minLine1, minLine2;
    let mp1, mp2;
    let minI;
    
    // Iterate over all points and assume that point is the closest to the corner. Fit two lines.
    for (let i = 4; i < points.length - 4; i++) {
      let points1 = points.slice(0, i);
      let points2 = points.slice(i);
      let discard1 = Math.round(points1.length * DISCARD_RATIO);
      let discard2 = Math.round(points2.length * DISCARD_RATIO);
      
      let line1 = Geom.fitLine(points1, discard1);
      let line2 = Geom.fitLine(points2, discard2);
      
      let line1Errors = Geom.processLineFittingErrors(line1, Geom.lineFittingError(line1, points1), discard1);
      let line2Errors = Geom.processLineFittingErrors(line2, Geom.lineFittingError(line2, points2), discard2);
      let avgError = ((points1.length - discard1) * line1Errors.avg + (points2.length - discard2) * line2Errors.avg) / (points.length - discard);
      if (line1Errors.max < ACCEPTABLE_DISTANCE && line2Errors.max < ACCEPTABLE_DISTANCE
          && avgError < minError) {
        minError = avgError;
        minLine1 = line1;
        minLine2 = line2;
        mp1 = points1;
        mp2 = points2;
        minI = i;
      }
    }
    
    if (singleLineError == Number.MAX_VALUE && minError == Number.MAX_VALUE) {
      console.log("cannot fit lines for " + center.x + " " + center.y);
      return null;
    }
    
    if (singleLineError != Number.MAX_VALUE && singleLineError < minError * 4) {
      // debugLineParametric(input, singleLine, 255, 255, 0);
      return [singleLine];
    } else {
      // debugLineParametric(input, minLine1, 255, 0, 0);
      // debugLineParametric(input, minLine2, 0, 255, 0);
      return [minLine1, minLine2];
    }
  }

  static findSameColorEdge(bitmap, start, color, delta, counter, limit) {
    let current = start;
    let found = true;
  
    if (bitmap.getPixel(Math.round(current.x), Math.round(current.y)) != color) {
      return null;
    }
    
    while (found && counter.count < limit) {
      found = false;
      let candidate = current.add(delta);
      if (bitmap.getPixel(Math.round(candidate.x), Math.round(candidate.y)) == color) {
        current = candidate;
        counter.count++;
        found = true;
      }
    }
    
    return counter.count >= limit ? null : current;
  }
  
  static findPatternEdge(bitmap, center, delta, runCount, limit) {
    if (limit === undefined) {
      limit = Number.MAX_VALUE;
    }
    
    let lastCounter = 0;
    let counter = { count: 0 };
    let runs = [];
    let current = center;
    let color = 0;
    
    for (let i = 0; i < runCount; i ++) {
      current = PatternVerifier.findSameColorEdge(bitmap, current, color, delta, counter, limit);
      if (current === null) {
        return null;
      }
      
      current = current.add(delta);
      runs.push(counter.count - lastCounter);
      lastCounter = counter.count;
      color = 255 - color;
    }
  
    current = current.subtract(delta);
  
    return {end: current, runs: runs};
  }
  
  
  static castLinesToQuadrant(bitmap, center, runCount, runPredicate, sign, dotCount, maxDistance) {
    let delta = Math.PI / (2 * (dotCount - 1));
    let result = [];
    for (let i = 0; i < dotCount; i++) {
      let phi = i * delta;
      let vec = new Vec(Math.cos(phi) * sign.x, Math.sin(phi) * sign.y);
      
      let end = PatternVerifier.findPatternEdge(bitmap, center, vec, runCount, maxDistance);
      if (end === null) {
        continue;
      }
      
      if (!runPredicate(end.runs)) {
        continue;
      }
      
      result.push(end.end);
    }
    
    if (Math.sign(sign.x) != Math.sign(sign.y)) {
      result.reverse();
    }
    
    return result;
  }
  
}