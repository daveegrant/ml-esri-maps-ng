(function(module) {
try {
  module = angular.module('ml.esri-maps.tpls');
} catch (e) {
  module = angular.module('ml.esri-maps.tpls', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/templates/detail-map.html',
    '<div id="{{ctrl.mapId}}" class="map-detail"></div>');
}]);
})();
