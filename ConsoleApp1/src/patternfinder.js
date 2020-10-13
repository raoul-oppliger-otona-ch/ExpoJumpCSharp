"use strict";

// Find a finder or an alignment pattern by looking at the [1,1,1,3,1,1,1] / [1,1,1,1,1] pattern
// of light and dark pixels.
class PatternFinder {
  constructor (bitmap, name, pattern, firstColor) {
    this.input = bitmap;
    this.pattern = pattern;
    this.firstColor = firstColor;
    this.tl = new Vec(0, 0);
    this.br = new Vec(bitmap.width, bitmap.height);
    this.debug = DebugImage.image(name);
  }
  
  setBorders(tl, br) {
    this.tl = tl;
    this.br = br;
  }
  
  findRunsVertically(x, y, delta, color) {
    let runCount = (this.pattern.length + 1) / 2;
    let runs = [];
    let current = 0;
    for (let i = 0; i < runCount; i++) {
      while (this.input.getPixel(x, y) === color && y >= 0 && y < this.input.height) {
        y += delta;
        current++;
      }
      runs.push(current);
      current = 0;
      color = 255 - color;
    }
    
    return runs;
  }
  
  moduleSizeForRunSet(runs) {
    let runSum = 0;
    let patternSum = 0;
    for (let i = 1; i < this.pattern.length - 1; i++) {
      runSum += runs[i];
      patternSum += this.pattern[i];
    }
    
    let minModule = Math.round((runSum / patternSum) * 0.7);
    let maxModule = Math.round((runSum / patternSum) / 0.7);
    if (runs[0] < minModule || runs[this.pattern.length - 1] < minModule) {
      return null;
    }
    
    for (let i = 1; i < this.pattern.length - 1; i++) {
      if (runs[i] < minModule * this.pattern[i] || runs[i] > maxModule * this.pattern[i]) {
        return null;
      }
    }

    let moduleSize = runSum / patternSum;
    return moduleSize >= 1.5 ? moduleSize : null;
  }

  checkRunsVertically(x, y, estimatedModuleSize) {
    let runsUpwards = this.findRunsVertically(x, y, -1, 0);
    let runsDownwards = this.findRunsVertically(x, y, 1, 0);
    if (Math.abs(runsUpwards[0] - runsDownwards[0]) > 2) {
      return null;
    }
    let runs = runsUpwards.slice(0);
    runs[0] += runsDownwards[0] - 1;
    runs.reverse();
    runs = runs.concat(runsDownwards.slice(1));
    let moduleSize = this.moduleSizeForRunSet(runs);
    if (moduleSize === null) {
      return null;
    }
    
    let top = y + 1;
    let bottom = y - 1;
    for (let i = 0; i < (this.pattern.length - 1) / 2; i++) {
      top -= runsUpwards[i];
      bottom += runsDownwards[i];
    }
    
    return [(top + bottom) / 2, moduleSize];
  }

  // Poor man's clustering. Assume that if a new point is far from an existing cluster, it's a
  // new one.
  addToClusterSet(clusterSet, location) {
    if (clusterSet.length === 0) {
      clusterSet.push([location]);
      return;
    }
    
    let foundCluster = null;
    
    for (let cluster of clusterSet) {
      let squareDistanceSum = 0;
      for (let point of cluster) {
        let squareBetweenPoints = location.squareDistance(point);
        let moduleSizeSum = point.moduleSize + location.moduleSize;
        let maxAllowedSquare = moduleSizeSum * moduleSizeSum;
        if (squareBetweenPoints < maxAllowedSquare) {
          foundCluster = cluster;
          break;
        }
      }
      
      if (foundCluster !== null) {
        break;
      }
    }
    
    if (foundCluster === null) {
      clusterSet.push([location]);
    } else {
      foundCluster.push(location);
    }
  }
  
  consolidateClusters(clusters) {
    let result = [];
    for (let cluster of clusters) {
      let sum = new Vec(0, 0);
      for (let point of cluster) {
        sum.x += point.x;
        sum.y += point.y;
      }
      
      result.push(new Vec(sum.x / cluster.length, sum.y / cluster.length));
    }
    
    return result;
  }
  
  checkRuns(x, y, runs, patternModules, clusters) {
    let xModuleSize = this.moduleSizeForRunSet(runs);
    if (xModuleSize !== null) {
      let xCenter = x - runs[this.pattern.length - 1] - Math.round(xModuleSize * patternModules / 2);
      let yResult = this.checkRunsVertically(xCenter, y, xModuleSize);
      if (yResult !== null) {
        let [yCenter, yModuleSize] = yResult;
        yCenter = Math.round(yCenter);
        let moduleSize = Math.round((xModuleSize + yModuleSize) / 2);
        let center = new Vec(xCenter, yCenter);
        center.moduleSize = moduleSize;
        this.addToClusterSet(clusters, center);
        this.debug.dot(xCenter, yCenter, 255, 255, 0);
      }
    }
  }
  
  findPattern() {
    let clusters = [];
    let patternModules = 0;
    for (let i = 1; i < this.pattern.length - 1; i++) {
      patternModules += this.pattern[i];
    }
    
    for (let y = Math.round(this.tl.y); y < Math.round(this.br.y); y++)  {
      let runs = [];
      let first = null;
      let current = null;
      
      for (let x = Math.round(this.tl.x); x < Math.round(this.br.x); x++) {
        if (this.input.getPixel(x, y) === current) {
          runs[runs.length - 1]++;
          continue;
        }
        
        // Now check if runs are okay
        if (first === this.firstColor && runs.length == this.pattern.length) {
          this.checkRuns(x, y, runs, patternModules, clusters);
        }
        
        current = this.input.getPixel(x, y);
        if (runs.length === 0) {
          first = current;
        }
        
        runs.push(1);
        if (runs.length > this.pattern.length) {
          runs.shift();
          first = 255 - first;
        }
      }
      
      this.checkRuns(Math.round(this.br.x), y, runs, patternModules, clusters);
    }
    
    let result = this.consolidateClusters(clusters);
    for (let finder of result) {
      this.debug.dot(finder.x, finder.y, 255, 0, 255);
    }
    
    this.debug.draw();
    return result;
  }
}
