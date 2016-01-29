(function () {

  'use strict';

  angular.module('ml.esri-maps')
  .directive('mlEsriSearchMap', MLEsriSearchMapDirective)
  .controller('mlEsriSearchMapController', MLEsriSearchMapController);

  function MLEsriSearchMapDirective() {
    return {
      restrict: 'E',
      scope: {
        options: '=',
        facets: '=',

        // parent callbacks
        parentBoundsChanged: '&boundsChanged'
      },
      template: '<div id="searchMap" class="map-search"></div>',
      controller: 'mlEsriSearchMapController',
      controllerAs: 'ctrl',
      link: function(scope, elem, attr) {
      }
    };
  }

  MLEsriSearchMapController.$inject = ['$scope', '$timeout', 'MLRest'];
  function MLEsriSearchMapController($scope, $timeout, mlRest) {
    var ctrl = this;

    ctrl.mapCenter = [-97.846, 38.591];
    ctrl.mapZoom = 3;
    ctrl.baseMap = 'national-geographic';
    ctrl.infoWindow = {
      titleFieldName: 'uri',
      idFieldName: 'uri',
      linkPrefix: '/detail'
    };

    // Override defaults with options defined in directive.
    if ($scope.options) {
      if ($scope.options.center) {
        ctrl.mapCenter = $scope.options.center;
      }

      if ($scope.options.zoom) {
        ctrl.mapZoom = $scope.options.zoom;
      }

      if ($scope.options.baseMap) {
        ctrl.baseMap = $scope.options.baseMap;
      }

      if ($scope.options.infoWindow) {
        if ($scope.options.infoWindow.titleFieldName) {
          ctrl.infoWindow.titleFieldName = $scope.options.infoWindow.titleFieldName;
        }

        if ($scope.options.infoWindow.idFieldName) {
          ctrl.infoWindow.idFieldName = $scope.options.infoWindow.idFieldName;
        }

        if ($scope.options.infoWindow.linkPrefix) {
          ctrl.infoWindow.linkPrefix = $scope.options.infoWindow.linkPrefix;
        }
      }
    }

    initMap();

    $scope.$watch('facets', function(newValue, oldValue) {
      clearFacets();
      processFacets();
    });

    /**
    *  Initializes the map with a single feature layer for locations.
    */
    function initMap() {
      require([
        'esri/map', 'esri/InfoTemplate',
        'esri/graphic', 'esri/symbols/SimpleMarkerSymbol',
        'esri/symbols/SimpleLineSymbol',
        'esri/symbols/TextSymbol', 'esri/symbols/Font',
        'esri/geometry/webMercatorUtils', 'esri/Color',
        'esri/geometry/Point', 'esri/geometry/Polygon',
        'esri/layers/GraphicsLayer'
      ], function(
        Map, InfoTemplate,
        Graphic, SimpleMarkerSymbol,
        SimpleLineSymbol,
        TextSymbol, Font,
        webMercatorUtils, Color,
        Point, Polygon,
        GraphicsLayer
      )
      {
        ctrl.map = new Map(
          'searchMap', {
            basemap: ctrl.baseMap,
            center: ctrl.mapCenter,
            zoom: ctrl.mapZoom,
            smartNavigation: false
          }
        );

        ctrl.graphicsLayer = new GraphicsLayer({id: 'data'});
        ctrl.map.addLayer(ctrl.graphicsLayer);

        // Create the marker color array.
        ctrl.markerColors = [
          new Color([255, 0, 0, 0.75]),   // red
          new Color([255, 85, 0, 0.75]),  // orange
          new Color([0, 92, 230, 0.75]),  // blue
          new Color([169, 0, 230, 0.75]), // purple
          new Color([76, 230, 0, 0.75])   // lime-green
        ];

        // Outer symbol for group marker
        ctrl.oGrpSym = new SimpleMarkerSymbol()
          .setColor( ctrl.markerColors[0] )
          .setOutline(new SimpleLineSymbol().setStyle(SimpleLineSymbol.STYLE_DASH))
          .setSize(45);

        // Inner symbol for group marker
        ctrl.iGrpSym = new SimpleMarkerSymbol()
          .setColor( new Color([214, 214, 214, 0.50]) )
          .setOutline( new SimpleLineSymbol().setStyle(SimpleLineSymbol.STYLE_DASH) )
          .setSize(25);

        // Text symbol for group marker
        ctrl.textGrpSym = new TextSymbol()
          .setColor( new Color([0, 0, 0, 1.0]) )
          .setVerticalAlignment('middle')
          .setFont( new Font().setWeight(Font.WEIGHT_BOLD) );

        // Handle layer updates based on current extent.
        ctrl.map.on('extent-change', function(evt) {
          ctrl.notifyExtentChange(evt);
        });

        ctrl.graphicsLayer.on('click', function(evt) {
          ctrl.markerClicked(evt);
        });

        /**
        * Handles issuing notifications when the map extent changes.
        */
        ctrl.notifyExtentChange = function(evt) {
          var coord1 = webMercatorUtils.xyToLngLat(evt.extent.xmin, evt.extent.ymax);
          var coord2 = webMercatorUtils.xyToLngLat(evt.extent.xmax, evt.extent.ymin);
          var extentData = {};
          extentData.west  = coord1[0];
          extentData.north = coord1[1];
          extentData.east  = coord2[0];
          extentData.south = coord2[1];

          $scope.bounds = extentData;
          $scope.$apply(function() {
            if ($scope.parentBoundsChanged) {
              $scope.parentBoundsChanged({ 'bounds': $scope.bounds});
            }
          });
        };

        /**
        *  Handles a click on a marker.  When the marker is a single marker, then
        *   the document details are retrieved and a subset of the data is displayed
        *   in the Info Window.
        */
        ctrl.markerClicked = function(evt) {
          // When a single point is clicked, the graphic should have an attribute
          //  for the document id.
          if( evt.graphic.attributes && evt.graphic.attributes.detailsId ) {
            // Retrieve the document data.
            var detailsId = evt.graphic.attributes.detailsId;
            mlRest.getDocument(evt.graphic.attributes.detailsId)
              .then(function successCallback(response) {
                if (response.data) {
                  var title = response.data.name ? response.data.name : detailsId;
                  var content = '<b><a href="' +
                    ctrl.infoWindow.linkPrefix +
                    detailsId +
                    '" target="_blank">Full Details</a></b>';

                  // Include a few attributes of the sample data set.
                  if (response.data.name) {
                    content += '<br/><b>Name</b>: ${name}' +
                      '<br/><b>Email</b>: ${email}' +
                      '<br/><b>Company</b>: ${company}' +
                      '<br/><b>Eye Color</b>: ${eyeColor}' +
                      '<br/><b>Favorite Fruit</b>: ${favoriteFruit}';
                  }

                  var infoTemplate = new InfoTemplate()
                    .setTitle(title)
                    .setContent(content);

                  evt.graphic.setAttributes(response.data);
                  evt.graphic.setInfoTemplate(infoTemplate);
                }
              }, function errorCallback(response) {
                // do nothing.
                console.log(response);
              });
          }
        };

        /**
        *  Creates a marker based on the information in the <box> details.
        *    - A cluster marker is used when the box has a count greater than 1.
        *    - A cluster marker includes the count and the size increases based on count.
        *    - A cluster marker will not do anything when clicked.
        *    - A point marker includes an Info Window to be displayed when clicked.
        */
        ctrl.addMarker = function(box, index, i) {
          var graphic, myGraphic = {};
          if (box.count === 1 && box.uri) {
            graphic = {
              'symbol': new SimpleMarkerSymbol().setColor( ctrl.markerColors[ i % ctrl.markerColors.length ] ),
              'geometry': new Point( {
                latitude: box.n,
                longitude: box.e
              })
            };

            myGraphic = new Graphic(graphic.geometry, graphic.symbol);
            myGraphic.setAttributes({'detailsId': box[ ctrl.infoWindow.idFieldName ] });
            ctrl.graphicsLayer.add(myGraphic);
          }
          else {
            var polygon = new Polygon( [
              [box.w, box.n],
              [box.e, box.n],
              [box.e, box.s],
              [box.w, box.s],
              [box.w, box.n]
            ]);

            // Calculate sizes for markers based on # of items in box.
            var countLength = box.count.toString().length;
            var outerSize = 35 + (countLength * 10);
            var innerSize = 25 + (countLength > 2 ? (countLength - 2) * 3 : 0);

            // Outer shape
            graphic = {
              'symbol': ctrl.oGrpSym.setColor( ctrl.markerColors[ i % ctrl.markerColors.length ] ),
              'geometry': polygon.getCentroid()
            };
            graphic.symbol.setSize(outerSize);
            myGraphic = new Graphic(graphic.geometry, graphic.symbol);
            ctrl.graphicsLayer.add(myGraphic);

            // Inner shape
            graphic = {
              'symbol': ctrl.iGrpSym,
              'geometry': polygon.getCentroid()
            };
            graphic.symbol.setSize(innerSize);
            myGraphic = new Graphic(graphic.geometry, graphic.symbol);
            ctrl.graphicsLayer.add(myGraphic);

            // Text in marker
            var graphicText = {
              'symbol': ctrl.textGrpSym.setText(box.count),
              'geometry': polygon.getCentroid()
            };

            var myGraphicText = new Graphic(graphicText.geometry, graphicText.symbol);
            ctrl.graphicsLayer.add(myGraphicText);
          }
        };
      });
    }

    /**
    *  Removes the current graphics layer.
    */
    function clearFacets() {
      if (ctrl.graphicsLayer) {
        ctrl.graphicsLayer.clear();
      }
    }

    /**
    *  Processes the facets looking for ones that include geospatial boxes.
    */
    function processFacets() {
      var facetName, facet, box;
      var i=0, index=0;

      // Return if the controller hasn't completed initialization
      if (!ctrl.addMarker) {
        return;
      }

      // Add the new markers.
      for (facetName in $scope.facets) {
        facet = $scope.facets[facetName];
        if (facet && facet.boxes) {
          for (index=0; index < facet.boxes.length; index++) {
            box = facet.boxes[index];
            ctrl.addMarker(box, index, i);
          }

          ++i;
        }
      }
    }
  }

}());
