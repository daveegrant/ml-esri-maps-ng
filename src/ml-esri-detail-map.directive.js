(function () {

  'use strict';

  angular.module('ml.esri-maps')
  .directive('mlEsriDetailMap', MLEsriDetailMapDirective)
  .controller('mlEsriDetailMapController', MLEsriDetailMapController);

  function MLEsriDetailMapDirective() {
    return {
      restrict: 'E',
      scope: {
        geometry: '=',
        geometries: '=',
        baseMap: '=',
        zoom: '=',
        mapId: '='
      },
      templateUrl: '/templates/detail-map.html',
      controller: 'mlEsriDetailMapController',
      controllerAs: 'ctrl'
    };
  }

  MLEsriDetailMapController.$inject = ['$scope', '$timeout'];
  function MLEsriDetailMapController($scope, $timeout) {
    var ctrl = this;
    var geometryData = [];
    var i=0;

    // Settings
    ctrl.mapId = $scope.mapId ? $scope.mapId : 'detail-map-1';
    ctrl.baseMap = $scope.baseMap ? $scope.baseMap : 'national-geographic';
    ctrl.mapZoom = $scope.zoom ? $scope.zoom : 6;
    ctrl.mapGeometry = null;

    if ($scope.geometry) {
      geometryData = processGeometry($scope.geometry);
    }

    if ($scope.geometries) {
      geometryData = processGeoJSON($scope.geometries);
    }

    // Have to wait for scope value of <mapId> to be updated in view
    // before the map can be initialized.
    $scope.$watch('mapId', function(newValue) {
      $timeout(function(){
        initMap(geometryData);
      }, 300);
    });

    /**
    *  Processes the <geometry> scope variable which can contain point data.
    */
    function processGeometry(geometry) {
      var geometryData = [];

      // Generate objects based on the provided geometry
      if (geometry && angular.isArray(geometry)) {
        // Use multi-point when an array-of-arrays.
        if (angular.isArray(geometry[0])) {
          for (i=0; i < geometry.length; i++) {
            if (!isNaN(geometry[i][0]) && geometry[i].length === 2) {
              geometryData.push({
                'type': 'point',
                'latitude': geometry[i][0],
                'longitude': geometry[i][1]
              });
            }
          }
        }
        else if (!isNaN(geometry[0]) && geometry.length === 2) {
          geometryData.push({
            'type': 'point',
            'latitude': geometry[0],
            'longitude': geometry[1]
          });

        }
      }

      return geometryData;
    }

    /**
    *  Processes the <geometry> scope variable which can contain point data.
    */
    function processGeoJSON(geoJsonData) {
      var geometryData = [];
      var convertedData = null;

      // Generate objects based on the provided geometry
      if (geoJsonData) {
        if (angular.isArray(geoJsonData)) {
          for (var i=0; i < geoJsonData.length; i++) {
            convertedData = convertSingleGeoJSON(geoJsonData[i]);
            if (convertedData) {
              if (angular.isArray(convertedData)) {
                geometryData = geometryData.concat(convertedData);
              }
              else {
                geometryData.push(convertedData);
              }
            }
          }
        }
        else {
          convertedData = convertSingleGeoJSON(geoJsonData);
          if (convertedData) {
            if (angular.isArray(convertedData)) {
              geometryData = geometryData.concat(convertedData);
            }
            else {
              geometryData.push(convertedData);
            }
          }
        }
      }

      return geometryData;
    }

    function convertSingleGeoJSON(geoJsonData) {
      var geometryData = null;

      if (geoJsonData && geoJsonData.type) {
        if (geoJsonData.type === 'Point') {
          geometryData = {
            'type': 'point',
            'latitude': geoJsonData.coordinates[1],
            'longitude': geoJsonData.coordinates[0]
          };
        }
        else if (geoJsonData.type === 'MultiPoint') {
          geometryData = {
            'type': 'multipoint',
            'points': geoJsonData.coordinates
          };
        }
        else if (geoJsonData.type === 'LineString') {
          geometryData = {
            'type': 'polyline',
            'paths': [ geoJsonData.coordinates ]
          };
        }
        else if (geoJsonData.type === 'MultiLineString') {
          geometryData = {
            'type': 'polyline',
            'paths': geoJsonData.coordinates
          };
        }
        else if (geoJsonData.type === 'Polygon') {
          geometryData = {
            'type': 'polygon',
            'rings': geoJsonData.coordinates
          };
        }
        else if (geoJsonData.type === 'MultiPolygon') {
          geometryData = [];
          for (var i=0; i < geoJsonData.coordinates.length; i++) {
            geometryData.push(
              {
                'type': 'polygon',
                'rings': geoJsonData.coordinates[i]
              }
            );
          }
        }
        else {
          console.log('Unknown GeoJSON geometry type: ', geoJsonData.type);
        }
      }

      return geometryData;
    }

    /**
    *  Initializes the map with a single feature layer for locations.
    */
    function initMap(geoData) {
      require([
        'esri/map', 'esri/graphic', 'esri/symbols/SimpleFillSymbol',
        'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
        'esri/layers/GraphicsLayer',
        'esri/geometry/Point', 'esri/geometry/Polygon',
        'esri/geometry/Multipoint', 'esri/geometry/Polyline',
        'esri/graphicsUtils', 'esri/Color'
      ], function(
        Map, Graphic, SimpleFillSymbol,
        SimpleMarkerSymbol, SimpleLineSymbol,
        GraphicsLayer,
        Point, Polygon,
        Multipoint, Polyline,
        graphicsUtils, Color
      )
      {
        processGeoData(geoData);

        ctrl.map = new Map(
          ctrl.mapId, {
            basemap: ctrl.baseMap,
            zoom: ctrl.mapZoom,
            smartNavigation: false
          }
        );

        ctrl.graphicsLayer = new GraphicsLayer({id: 'data'});
        ctrl.map.addLayer(ctrl.graphicsLayer);

        // Use the geometry information to draw on the map once it is loaded.
        ctrl.map.on('load', function() {
          if (ctrl.mapGeometry) {
            ctrl.drawData(ctrl.mapGeometry);
          }
        });

        /**
        * Processes the geospatial data passed to the map in order to draw it on the map.
        */
        function processGeoData(geoData) {
          if (geoData && geoData.length > 0) {
            ctrl.mapGeometry = [];
            for (var i=0; i < geoData.length; i++) {
              if (geoData[i].type === 'point') {
                ctrl.mapGeometry.push( new Point(geoData[i]) );
              }
              else if (geoData[i].type === 'multipoint') {
                ctrl.mapGeometry.push( new Multipoint(geoData[i]) );
              }
              else if (geoData[i].type === 'polygon') {
                ctrl.mapGeometry.push( new Polygon(geoData[i]) );
              }
              else if (geoData[i].type === 'polyline') {
                ctrl.mapGeometry.push( new Polyline(geoData[i]) );
              }
            }
          }
        }

        /**
        * Draw a shape on the map based on the specified geometry object.
        */
        ctrl.drawData = function(geometry) {
          if (geometry && geometry.length > 0) {
            for (var i=0; i < geometry.length; i++) {
              var symbol = null;
              if (geometry[i].type === 'point') {
                symbol = new SimpleMarkerSymbol().setColor(new Color([0, 0, 0, 0.60]));
              }
              else if (geometry[i].type === 'multipoint') {
                symbol = new SimpleMarkerSymbol().setColor(new Color([0, 0, 0, 0.60]));
              }
              else if (geometry[i].type === 'polygon') {
                symbol = new SimpleFillSymbol().setColor( new Color([0, 0, 0, 0.60]) );
              }
              else if (geometry[i].type === 'polyline') {
                symbol = new SimpleLineSymbol().setColor( new Color([0, 0, 0, 0.60]) );
              }

              if (symbol) {
                var graphic = new Graphic(geometry[i], symbol);
                ctrl.graphicsLayer.add(graphic);
              }
            }
            // Set extent so that map zooms as close as possible and still
            //  shows all graphics.
            var myExtent = graphicsUtils.graphicsExtent(ctrl.graphicsLayer.graphics);
            ctrl.map.setExtent(myExtent, true);
          }
        };
      });
    }
  }

}());
