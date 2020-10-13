"use strict";

class ModuleMatrix {
  constructor(bitmap, size, moduleSize) {
    this.bitmap = bitmap;
    this.size = size;
    this.moduleSize = moduleSize;
  }
  
  get(x, y) {
    let u = (x + 0.5) * this.moduleSize;
    let v = (y + 0.5) * this.moduleSize;
    return this.bitmap.getPixel(u, v) === 0 ? 1 : 0;  // Black is 1
  }
}

class QRReader {
  static findFinderPatterns(binary) {
    let finderFinder = new PatternFinder(binary, "finder", [1, 1, 1, 3, 1, 1, 1], 255);
    let finderPatterns = finderFinder.findPattern();
  
    let corners = QRReader.sortFinderPatterns(binary, finderPatterns);
    if (corners == null) {
      return null;
    }

    let debug = DebugImage.image("qrreader");
    debug.dot(corners.tl.x, corners.tl.y, 255, 255, 0);
    debug.dot(corners.tr.x, corners.tr.y, 255, 0, 0);
    debug.dot(corners.bl.x, corners.bl.y, 0, 255, 0);
    debug.dot(corners.br.x, corners.br.y, 0, 255, 255);
    
    return corners;
  }

  static findCornersInDirection(where, from, direction) {
    let candidates = [];
    for (let i = 0; i < 4; i++) {
      let candidate = where.corners[i];
      if (Geom.isClockwise(from.center, candidate, where.center) === direction) {
        candidates.push({index: i, distance: from.center.squareDistance(candidate)});
      }
    }
  
    if (candidates.length !== 2) {
      return [null, null];
    }
    
    candidates.sort((a, b) => a.distance - b.distance);
    
    let line;
    let otherCorner;
    if (candidates[0].index === (candidates[1].index + 1) % 4) {
      otherCorner = where.corners[(candidates[1].index + 3) % 4];
    } else if (candidates[0].index === (candidates[1].index + 3) % 4) {
      otherCorner = where.corners[(candidates[1].index + 1) % 4];
    } else {
      return [null, null];
    }
    
    return [where.corners[candidates[1].index], where.corners[candidates[0].index],
        otherCorner, where.corners[(candidates[1].index + 2) % 4]];
  }
  
  static areFinderPatternsSorted(tl, tr, bl) {
    // First we figure out is TL->TR is to the right of TR->BL
    if (!Geom.isClockwise(tl.center, bl.center, tr.center)) {
      return null;
    }
    
    // Then we find out the corner of the TL pattern that is the furthest from the BL one and is
    // counterclockwise to BL -> TL vector. That will be the TL corner of the whole thing.
      
    let [tlCorner, tlLeftMiddle,, tlMiddle] = QRReader.findCornersInDirection(tl, bl, false);
    let [tlCorner2, tlTopMiddle,,,] = QRReader.findCornersInDirection(tl, tr, true);
    
    if (tlCorner !== tlCorner2) {
      return null;
    }
    
    let [blCorner, blLeftMiddle, blOther, blMiddle] = QRReader.findCornersInDirection(bl, tl, true);
    let [trCorner, trTopMiddle, trOther, trMiddle] = QRReader.findCornersInDirection(tr, tl, false);
    
    // Now, if we are not mistaken, the lines should be aligned just right.
    // TODO: check angle between TL-BL and *leftIndex and TL-TR and *topIndex
    
    let ANGLE_THRESHOLD = Math.cos(15 * Math.PI / 180);
    if (Geom.dotProductNormalized(tlLeftMiddle.subtract(tlCorner), bl.center.subtract(tl.center)) < ANGLE_THRESHOLD) {
      return null;
    }
  
    if (Geom.dotProductNormalized(blLeftMiddle.subtract(blCorner), tl.center.subtract(bl.center)) < ANGLE_THRESHOLD) {
      return null;
    }
    
    if (Geom.dotProductNormalized(tlTopMiddle.subtract(tlCorner), tr.center.subtract(tl.center)) < ANGLE_THRESHOLD) {
      return null;
    }
    
    if (Geom.dotProductNormalized(trTopMiddle.subtract(trCorner), tl.center.subtract(tr.center)) < ANGLE_THRESHOLD) {
      return null;
    }
    
    let brCorner = Geom.intersectLines(trCorner, trOther, blCorner, blOther);
    let debug = DebugImage.image("qrreader");
    debug.dot(brCorner.x, brCorner.y, 255, 0, 255);
    
    let alignment = Geom.intersectLines(blLeftMiddle, blMiddle, trTopMiddle, trMiddle);
    debug.dot(alignment.x, alignment.y, 255, 0, 255);

    return { tl: tlCorner, tr: trCorner, bl: blCorner, br: brCorner,
             blLeftMiddle: blLeftMiddle, trTopMiddle: trTopMiddle,
             blMiddle: blMiddle, trMiddle: trMiddle };
  }

  static process(bitmap) {
    let grayscale = QRReader.toGrayscale(bitmap);
    let binary = QRReader.binarize(grayscale);
    let INITIAL_UV_SIZE = 600;
    
    // Try to find the finder patterns in the corners of the QR code
    let corners = QRReader.findFinderPatterns(binary);
    if (corners === null) {
      return null;
    }
    
    // Use the three finder patterns and an estimate for the bottom-right corner to compute a
    // transformation that transforms the QR code to a perfect square
    let transform = Perspective.squareToQuadrilateral(
        corners.tl, corners.tr, corners.bl, corners.br);
    
    let perspectiveCorrected = new PerspectiveBitmap(
      grayscale, binary.thresholdMap, INITIAL_UV_SIZE, INITIAL_UV_SIZE, transform);
  
    let debugPc1 = DebugImage.fromSize("perspectivecorrected1", INITIAL_UV_SIZE + 100, INITIAL_UV_SIZE + 100);
    
    if (debugPc1.enabled) {
      for (let v = 0; v < INITIAL_UV_SIZE + 100; v++) {
        for (let u = 0; u < INITIAL_UV_SIZE + 100; u++) {
          let c = perspectiveCorrected.getPixel(u, v);
          debugPc1.bitmap.putColor(u, v, c, c, c);
        }
      }
    }
    
    // If we can find an alignment pattern on the bottom right, refine our estimate of the bottom
    // right corner using it. Otherwise, just use what we have.
    let brByAlignmentPattern = QRReader.findBottomRightByAlignmentPattern(
        perspectiveCorrected, corners, transform);
    if (brByAlignmentPattern !== null) {
      console.log("Found bottom right based on alignment pattern: x=" +
          brByAlignmentPattern.x + ", y=" + brByAlignmentPattern.y);
      transform = Perspective.squareToQuadrilateral(corners.tl, corners.tr, corners.bl, brByAlignmentPattern);
      perspectiveCorrected = new PerspectiveBitmap(
        grayscale, binary.thresholdMap, INITIAL_UV_SIZE, INITIAL_UV_SIZE, transform);
    }
  
    debugPc1.draw();
    
    // Now we have a perspective corrected QR code. Start interpreting modules.
    let moduleSize = QRReader.estimateModuleSize(
        perspectiveCorrected, corners.trMiddle, corners.blMiddle, transform);
    let modulesPerSide = 1/moduleSize;
    console.log("Estimated module count: " + modulesPerSide);
    modulesPerSide = Math.round((modulesPerSide - 21) / 4) * 4 + 21;
    console.log("Rounded module count: " + modulesPerSide);
  
    let samplingBitmap = new PerspectiveBitmap(
      grayscale, binary.thresholdMap, modulesPerSide * 5, modulesPerSide * 5, transform);
    
    let debugSampling = DebugImage.fromSize("sampling", modulesPerSide * 5, modulesPerSide * 5);
    
    if (debugSampling.enabled) {
      for (let v = 0; v < samplingBitmap.height + 5; v++) {
        for (let u = 0; u < samplingBitmap.width + 5; u++) {
          let c = samplingBitmap.getPixel(u, v);
          debugSampling.bitmap.putColor(u, v, c, c, c);
        }
      }

      for (let y = 0; y < modulesPerSide; y++) {
        let uvY = (y + 0.5) / modulesPerSide;
        for (let x = 0; x < modulesPerSide; x++) {
          let uvX = (x + 0.5) / modulesPerSide;
          debugSampling.dot(x*5 + 2, y*5 + 2, 0, 255, 0, 0);
        }
      }
    }
    
    let moduleMatrix = new ModuleMatrix(samplingBitmap, modulesPerSide, 5);
    let formatInfo = QRReader.getFormatInfo(moduleMatrix);
    if (formatInfo === null) {
      return null;
    }
    
    console.log("Error correction level: " + formatInfo.errorCorrection);
    console.log("Mask: " + formatInfo.mask);
    
    // Larger QR codes know which version they are. The version of smaller ones is estimated based
    // on the size and distance of finder patterns (easy to do in transformed coordinates)
    if (modulesPerSide >= 45) {
      let versionInfo = QRReader.getVersionInfo(moduleMatrix);
      if (versionInfo === null) {
        console.log("Cannot find version info")
        return null;
      }
    
      console.log("Code version: " + versionInfo + " (est.: " + ((modulesPerSide - 17) / 4) + ")");
      moduleMatrix = new ModuleMatrix(samplingBitmap, versionInfo * 4 + 17, 5);
    }
    
    let decoder = new QRDecoder(moduleMatrix, formatInfo);
    let result = decoder.process();
    debugSampling.draw();
    return result;
  }

  static* selectWithoutReplacement(inputItems, inputCount) {
    let items = inputItems.slice(0);
    let acc = [];
    let recurse = function* (count, start, callback) {
      if (count == 0) {
        yield acc;
      } else {
        for (let i = 0; i < items.length; i++) {
          let item = items.splice(i, 1)[0];
          acc.push(item);
          yield* recurse(count - 1, i + 1);
          acc.pop();
          items.splice(i, 0, item);
        }
      }
    };
    
    yield* recurse(inputCount, 0);
  }
  

  static sortFinderPatterns(bitmap, centers) {
    // First figure out which finder patterns are real (the detector has a lot of false positives)
    let confirmedPatterns = centers
        .map(p => PatternVerifier.findAllFinderPatternEdges(bitmap, p))
        .filter(s => s !== null);
  
    if (confirmedPatterns.length < 3) {
      console.log("Not enough finder patterns (found " + confirmedPatterns.length + ")")
      return null;
    }
    if (confirmedPatterns.length > 8) {
      console.log("Too many finder patterns (found " + confirmedPatterns.length + ")");
      return null;
    }
    
    // Then find a triplet that are aligned well enough to plausibly form a QR code
    let ANGLE_THRESHOLD = Math.cos(15 * Math.PI / 180);
    for (let [tl, tr, bl] of QRReader.selectWithoutReplacement(confirmedPatterns, 3)) {
      let result = QRReader.areFinderPatternsSorted(tl, tr, bl);
      if (result !== null) {
        return result;
      }
    }
    
    console.log("Cannot order finder patterns properly");
    return null;
  }

  static estimateModuleSize(perspectiveCorrected, trMiddle, blMiddle, transform) {
    let inverseTransform = transform.inverse();
    let uvTRM = inverseTransform.apply(trMiddle);
    let uvBLM = inverseTransform.apply(blMiddle);

    let avgDistance = (uvTRM.y + uvBLM.x + (1-uvTRM.x) + (1-uvBLM.y)) / 4;
    return avgDistance / 7;
  }
  

  static findBottomRightByAlignmentPattern(perspectiveCorrected, corners, transform) {
    // Compute an area where the alignment pattern can plausibly be found. It must be around the
    // intersection of the top side of the bottom-left finder pattern and the left side of the
    // top-right finder pattern.
    let debug = DebugImage.image("perspectivecorrected1");
    let size = perspectiveCorrected.width;
    let inverseTransform = transform.inverse();
    let pTRM = inverseTransform.apply(corners.trMiddle);
    let pBLM = inverseTransform.apply(corners.blMiddle);
    let pTRT = inverseTransform.apply(corners.trTopMiddle);
    let pBLL = inverseTransform.apply(corners.blLeftMiddle);
    let estimatedModuleSize = ((pTRM.y - pTRT.y) + (pBLM.x - pBLL.x))/(2*7);
    let estimatedAlignmentPattern = Geom.intersectLines(pTRM, pTRT, pBLM, pBLL);
    let searchDelta = new Vec(estimatedModuleSize * 6, estimatedModuleSize * 6);
    let searchTL = estimatedAlignmentPattern.subtract(searchDelta);
    let searchBR = estimatedAlignmentPattern.add(searchDelta);
    debug.dot(estimatedAlignmentPattern.x*size, estimatedAlignmentPattern.y*size, 0, 255, 0);
    debug.dot(searchTL.x*size, searchTL.y*size, 255, 0, 0);
    debug.dot(searchBR.x*size, searchBR.y*size, 255, 0, 0);
    debug.dot(pTRM.x*size, pTRM.y*size, 255, 0, 255);
    debug.dot(pBLM.x*size, pBLM.y*size, 255, 0, 255);
    debug.dot(pTRT.x*size, pTRT.y*size, 255, 0, 255);
    debug.dot(pBLL.x*size, pBLL.y*size, 255, 0, 255);
    
    
    let alignFinder = new PatternFinder(perspectiveCorrected, "alignment", [1, 1, 1, 1, 1], 0);
    alignFinder.setBorders(searchTL.scale(size), searchBR.scale(size));
    let alignPatterns = alignFinder.findPattern();
    if (alignPatterns.length === 0) {
      console.log("cannot find alignment pattern");
      return null;
    }
  
    let alignTL = null, alignBR = null;
  
    for (let alignPattern of alignPatterns) {
      let tlLines = PatternVerifier.fitQuadrant(perspectiveCorrected, alignPattern, 2, () => true, new Vec(-1, -1));
      if (tlLines === null || tlLines.length !== 2) {
        continue;
      }
    
      let brLines = PatternVerifier.fitQuadrant(perspectiveCorrected, alignPattern, 2, () => true, new Vec(1, 1));
      if (brLines === null || brLines.length !== 2) {
        continue;
      }
  
      alignTL = Geom.intersectParametricLines(tlLines[0], tlLines[1]);
      alignBR = Geom.intersectParametricLines(brLines[0], brLines[1]);
      break;
    }
  
    if (alignTL === null) {
      console.log("Cannot verify alignment pattern");
      return null;
    }
    
    // Fudge factor. TL and BR are both on the "inner" side of the line and it's better if one of
    // them is on the outer one. Assume that the image is already almost perspective corrected and
    // then adding (0.5, 0.5) just works.
    alignBR = alignBR.add(new Vec(0.5, 0.5));
    let patternBR = alignBR.add(alignBR.subtract(alignTL).scale(5/3));

    debug.dot(alignTL.x, alignTL.y, 255, 255, 0);
    debug.dot(alignBR.x, alignBR.y, 255, 255, 0);
    debug.dot(patternBR.x, patternBR.y, 255, 0, 255);
    return transform.apply(patternBR.scale(1/size));
    
    let alignCenter = alignPatterns[0].scale(1/size);
    let brDistance = alignPatterns[0].moduleSize / size * 6.5;
    let actualBottomRight = alignCenter.add(new Vec(brDistance, brDistance));
    debug.dot(alignCenter.x * size, alignCenter.y * size, 0, 255, 255);

    return transform.apply(actualBottomRight);
  }
  
  
  static getVersionInfo(matrix) {
    let trBlock = {
      name: "tr",
      x: matrix.size - 9,
      y: 5,
      innerDelta: { x: -1, y: 0 },
      outerDelta: { x: 0, y: -1 },
    };
    
    let blBlock = {
      name: "bl",
      x: 5,
      y: matrix.size - 9,
      innerDelta: { x: 0, y: -1 },
      outerDelta: { x: -1, y: 0 },
    }
    
    for (let block of [trBlock, blBlock]) {
      let acc = 0;
      for (let outer = 0; outer < 6; outer++) {
        let outerX  = block.x + block.outerDelta.x * outer;
        let outerY  = block.y + block.outerDelta.y * outer;
        
        for (let inner = 0; inner < 3; inner++) {
          let x = outerX + block.innerDelta.x * inner;
          let y =  outerY + block.innerDelta.y * inner;
          acc += matrix.get(x, y);
          acc <<= 1;
        }
      }
      
      let result = NearestSymbol.VERSION_INFO.decode(acc >> 1);
      if (result !== null) {
        console.log("Found version info at " + block.name);
        return result;
      }
    }
    
    console.log("Cannot find version info");
    return null;
  }
  
  static getFormatInfo(matrix) {
    let formatInfo = null;
    for (let [name, positions] of [
        ["tl", FORMAT_INFO_BIT_POSITIONS_1], ["tr/bl", FORMAT_INFO_BIT_POSITIONS_2]]) {
      let acc = 0;
      for (let p of positions) {
        let x = p[0] < 0 ? matrix.size + p[0] : p[0];
        let y = p[1] < 0 ? matrix.size + p[1] : p[1];
        acc += matrix.get(x, y);
        acc <<= 1;
      }
      
      formatInfo = NearestSymbol.FORMAT_INFO.decode(acc >> 1);
      if (formatInfo !== null) {
        console.log("Found format info at " + name);
        break;
      }
    }
    
    if (formatInfo === null) {
      console.log("Cannot find format info");
      return null;
    }
    
    return {
      errorCorrection: EC_LEVELS[formatInfo >> 3],
      mask: formatInfo & 0x7,
    };
  }
  
  static toGrayscale(bitmap) {
    let result = new Uint8ClampedArray(bitmap.data.length / 4);
    let oi = 0;
    let ii = 0;
    for (; ii < bitmap.data.length; ii += 4, oi += 1) {
      result[oi] = (299 * bitmap.data[ii] + 587 * bitmap.data[ii + 1] + 114 * bitmap.data[ii + 2]) / 1000;
    }
    
    return new Bitmap(result, bitmap.width, bitmap.height, 1);
  }
  
  // Compares each pixel to its local environment. Cleverly fails when an individual module is
  // larger than the neighbourhood considered here.
  static binarize(bitmap) {
    let clamp = (v, min, max) => {
      if (v < min) {
        return min;
      }
      
      if (v > max) {
        return max;
      }
      
      return v;
    }
  
    let sums = new Uint32Array(bitmap.width * bitmap.height);
    let sumBitmap = new Bitmap(sums, bitmap.width, bitmap.height, 1);
    let result = new Bitmap(
      new Uint8ClampedArray(bitmap.width * bitmap.height),
      bitmap.width,
      bitmap.height,
      1);
    
    for (let y = 0; y < bitmap.height; y++) {
      let linesum = 0;
      for (let x = 0; x < bitmap.width; x++) {
        linesum += bitmap.getPixel(x, y);
        let sum = linesum;
        if (y > 0) {
          sum += sumBitmap.getPixel(x, y-1);
        }
        
        sumBitmap.putPixel(x, y, sum);
      }
    }
    
    let thresholdMap = new Bitmap(
      new Uint8ClampedArray(bitmap.width * bitmap.height),
      bitmap.width,
      bitmap.height,
      1);
      
    const localityX = Math.floor(bitmap.width / 18);
    const localityY = Math.floor(bitmap.height / 18);
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        let tlx = clamp(x-localityX-1, 0, bitmap.width - 1);
        let tly = clamp(y-localityY-1, 0, bitmap.he1ght - 1);
        let brx = clamp(x+localityX, 0, bitmap.width - 1);
        let bry = clamp(y+localityY, 0, bitmap.height - 1);
        
        let sum = sumBitmap.getPixel(brx, bry) - sumBitmap.getPixel(tlx, bry) - sumBitmap.getPixel(brx, tly) + sumBitmap.getPixel(tlx, tly);
        let mean = sum / ((brx - tlx) * (bry - tly));
        let sigma = bitmap.getPixel(x, y) - mean;
        mean /= 256.0;
        sigma /= 256.0;
        let threshold = mean * (1 + 0.02 * ( (sigma/(1 - sigma)) - 1));
        thresholdMap.putPixel(x, y, threshold * 256.0);
        result.putPixel(x, y, bitmap.getPixel(x, y) < threshold*256.0 ? 0 : 255);
      }
    }
    
    result.thresholdMap = thresholdMap;
    return result;
  }
}
