"use strict"

module.exports = renderComplex

var splitPolygon = require("split-polygon")
var glmatrix = require("gl-matrix")
var vec4 = glmatrix.vec4
var mat4 = glmatrix.mat4

var identity = [1,0,0,0,
                0,1,0,0,
                0,0,1,0,
                0,0,0,1]

var frustum = [
  [ 1, 0, 0,-1],
  [-1, 0, 0,-1],
  [ 0, 1, 0,-1],
  [ 0,-1, 0,-1],
  [ 0, 0, 1,-1],
  [ 0, 0,-1, 0]
]

function transformVertices(vertices, matrix) {
  var v = [0,0,0,1]
  return vertices.map(function(vv) {
    for(var j=0; j<3; ++j) {
      v[j] = vv[j]
    }
    var u = [0,0,0,0]
    vec4.transformMat4(u, v, matrix)
    return u
  })
}

function zSortCells(vertices, cells) {
  var taggedCells = cells.map(function(c) {
    var clipProject = frustum.reduce(function(poly, plane) {
      if(poly.length > 0) {
        return splitPolygon.negative(poly, plane)  
      }
      return poly
    }, c.map(function(i) {
        return vertices[i]
      }
    )).map(function(v) {
      return [v[0]/v[3], v[1]/v[3], v[2]/v[3]]
    })
    var zmax = clipProject.reduce(function(vertex, z) {
      return Math.max(z, vertex[2])
    }, -Infinity)
    return [zmax, clipProject]
  }).filter(function(pair) {
    return (pair[0] > -Infinity) || isNaN(pair[0])
  })
  taggedCells.sort(function(a, b) { 
    return a[0] - b[0]
  })
  return taggedCells.map(function(x) {
    return x[1]
  })
}

function renderComplex(vertices, cells, options) {
  options = options || {}
  var model = options.model || identity
  var view = options.view || identity
  var projection = options.projection || identity
  var viewport = options.viewport || [[-1,-1], [1,1]]

  //Construct model-view-projection matrix
  var mvp = new Array(16)
  mat4.multiply(mvp, view, model)
  mat4.multiply(mvp, projection, mvp)

  //Transform vertices
  var clipVerts = transformVertices(vertices, mvp)
  
  //Sort polygons by z distance
  var zcells = zSortCells(clipVerts, cells)

  //Splat cells to list
  return zcells.map(function(cell) {
    return '<polygon points="' + cell.map(function(v) { 
      var x = 0.5 * (v[0] + 1.0) * (viewport[1][0] - viewport[0][0]) + viewport[0][0]
      var y = 0.5 * (1.0 - v[1]) * (viewport[1][1] - viewport[0][1]) + viewport[0][1]
      return x + "," + y
    }).join(" ") + '"/>'
  }).join("\n")
}