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
        baseMap: '=',
        zoom: '='
      },
      template: '<div id="detailMap" class="map-detail"></div>',
      controller: 'mlEsriDetailMapController',
      controllerAs: 'ctrl'
    };
  }

  MLEsriDetailMapController.$inject = ['$scope'];
  function MLEsriDetailMapController($scope) {
    var ctrl = this;
    var geometryData = [];
    var i=0;

    // Settings
    ctrl.baseMap = $scope.baseMap ? $scope.baseMap : 'national-geographic';
    ctrl.mapZoom = $scope.zoom ? $scope.zoom : 6;
    ctrl.mapGeometry = null;

    // Generate objects based on the provided geometry
    if ($scope.geometry && angular.isArray($scope.geometry)) {
      // Use multi-point when an array-of-arrays.
      if (angular.isArray($scope.geometry[0])) {
        for (i=0; i < $scope.geometry.length; i++) {
          if (!isNaN($scope.geometry[i][0]) && $scope.geometry[i].length === 2) {
            geometryData.push({
              'type': 'point',
              'latitude': $scope.geometry[i][0],
              'longitude': $scope.geometry[i][1]
            });
          }
        }
      } else if (!isNaN($scope.geometry[0]) && $scope.geometry.length === 2) {
        geometryData.push({
          'type': 'point',
          'latitude': $scope.geometry[0],
          'longitude': $scope.geometry[1]
        });

      }
    }

    initMap(geometryData);

    /**
    *  Initializes the map with a single feature layer for locations.
    */
    function initMap(geoData) {
      require([
        'esri/map', 'esri/graphic', 'esri/symbols/SimpleFillSymbol',
        'esri/symbols/SimpleMarkerSymbol', 'esri/layers/GraphicsLayer',
        'esri/geometry/Point', 'esri/geometry/Polygon',
        'esri/graphicsUtils', 'esri/Color'
      ], function(
        Map, Graphic, SimpleFillSymbol,
        SimpleMarkerSymbol, GraphicsLayer,
        Point, Polygon,
        graphicsUtils, Color
      )
      {
        processGeoData(geoData);

        ctrl.map = new Map(
          'detailMap', {
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
              } else if (geoData[i].type === 'polygon') {
                ctrl.mapGeometry.push( new Polygon(geoData[i]) );
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
              if (geometry[i] instanceof Point) {
                symbol = new SimpleMarkerSymbol().setColor(new Color([0, 0, 0, 0.60]));
              } else if (geometry[i] instanceof Polygon) {
                symbol = new SimpleFillSymbol().setColor( new Color([0, 0, 0, 0.60]) );
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
