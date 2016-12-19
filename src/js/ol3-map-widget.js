/* globals ol, StyledElements */

(function (mp) {

    "use strict";

    var extent = mp.prefs.get('extent').split(',').map(Number);
    var projection = new ol.proj.Projection({
        code: 'one-m2m-map',
        units: 'pixels',
        extent: extent
    });

    // Create the default Marker style
    var DEFAULT_MARKER = new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
            anchor: [0.5, 46],
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            opacity: 0.75,
            src: 'http://openlayers.org/en/v3.10.1/examples/data/icon.png'
        }))
    });

    var Widget = function Widget() {
    };

    Widget.prototype.init = function init() {
        mp.wiring.registerCallback('poiInput', function (poi_info) {
            var iconFeature, style, newFeature = false;

            poi_info = JSON.parse(poi_info);
            iconFeature = this.vector_source.getFeatureById(poi_info.id);

            if (iconFeature == null) {
                iconFeature = new ol.Feature();
                iconFeature.setId(poi_info.id);
                newFeature = true;
            }

            iconFeature.set('data', poi_info.data);
            iconFeature.set('title', poi_info.title);
            iconFeature.set('content', poi_info.infoWindow);
            iconFeature.setGeometry(new ol.geom.Point([poi_info.currentLocation.lat, poi_info.currentLocation.lng]));

            if (typeof poi_info.icon === 'string') {
                style = new ol.style.Style({
                    image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
                        anchor: [0.5, 1],
                        opacity: 0.75,
                        src: poi_info.icon
                    }))
                });
            } else {
                style = DEFAULT_MARKER;
            }
            iconFeature.setStyle(style);

            if (newFeature) {
                this.vector_source.addFeature(iconFeature);
            }
        }.bind(this));

        mp.wiring.registerCallback('deletePoiInput', function (poi_info) {
            var feature;

            poi_info = JSON.parse(poi_info);
            feature = this.vector_source.getFeatureById(poi_info.id);

            if (feature != null) {
                this.vector_source.removeFeature(feature);
            }
        }.bind(this));

        this.image_layer = new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: mp.prefs.get('map_url'),
                projection: projection,
                imageExtent: extent
            })
        });
        this.vector_source = new ol.source.Vector({});
        this.vector_layer = new ol.layer.Vector({source: this.vector_source, style: DEFAULT_MARKER});
        this.map = new ol.Map({
            target: document.getElementById('map'),
            controls: [
                new ol.control.Zoom()
            ],
            layers: [
                this.image_layer,
                this.vector_layer,
            ],
            view: new ol.View({
                projection: projection,
                extent: extent,
                center: ol.extent.getCenter(extent),
                minZoom: mp.prefs.get('minzoom'),
                zoomFactor: 1.25
            })
        });

        // display popup on click
        this.map.on('click', function (event) {
            var feature;

            feature = this.map.forEachFeatureAtPixel(event.pixel,
                function (feature, layer) {
                    return feature;
                });

            if (feature != null && feature !== this.selected_feature) {
                this.select_feature(feature);
            } else if (feature !== this.selected_feature) {
                if (this.popover != null) {
                    this.popover.hide();
                    this.popover = null;
                }
            }
        }.bind(this));

        // change mouse cursor when over marker
        this.map.on('pointermove', function (event) {
            if (event.dragging) {
                if (this.popover != null) {
                    this.popover.hide();
                    this.popover = null;
                }
                return;
            }
            var pixel = this.map.getEventPixel(event.originalEvent);
            var hit = this.map.hasFeatureAtPixel(pixel);
            this.map.getTarget().style.cursor = hit ? 'pointer' : '';
        }.bind(this));

        /* update popup position when the zoom level changes
        this.map.getView().on('change:resolution', function (event) {
            if (this.selected_feature != null) {
                this.center_popup_menu(this.selected_feature);
            }
        }.bind(this));
        */

        this.map.getView().fit(extent, this.map.getSize());

        mp.prefs.registerCallback(function () {
            var extent = mp.prefs.get('extent').split(',').map(Number);
            var projection = new ol.proj.Projection({
                code: 'one-m2m-map',
                units: 'pixels',
                extent: extent
            });
            this.map.removeLayer(this.image_layer);
            this.image_layer = new ol.layer.Image({
                source: new ol.source.ImageStatic({
                    url: mp.prefs.get('map_url'),
                    projection: projection,
                    imageExtent: extent
                })
            });
            this.map.getLayers().insertAt(0, this.image_layer);
            this.map.setView(new ol.View({
                projection: projection,
                extent: extent,
                center: ol.extent.getCenter(extent),
                minZoom: mp.prefs.get('minzoom'),
                zoomFactor: 1.25
            }));
            this.map.getView().fit(extent, this.map.getSize());
        }.bind(this));
    };

    Widget.prototype.center_popup_menu = function center_popup_menu(feature) {

        this.selected_feature = feature;
        this.popover = new StyledElements.Popover({
            placement: ['top', 'bottom', 'right', 'left'],
            title: feature.get('title'),
            content: new StyledElements.Fragment(feature.get('content'))
        });
        this.popover.on('show', function () {
            this.selected_feature = feature;
        }.bind(this));
        this.popover.on('hide', function () {
            if (this.selected_feature === feature) {
                this.selected_feature = null;
            }
        }.bind(this));

        // Delay popover show action
        setTimeout(function () {
            var marker_coordinates, marker_position, marker_size;

            marker_coordinates = ol.extent.getCenter(feature.getGeometry().getExtent());
            marker_position = this.map.getPixelFromCoordinate(marker_coordinates);
            marker_size = feature.getStyle().getImage().getSize();
            var refpos = {
                top: marker_position[1] - marker_size[1],
                left: marker_position[0] - (marker_size[0] / 2),
                width: marker_size[0],
                height: marker_size[1]
            };
            this.selected_feature = feature;
            this.popover.show(refpos);
        }.bind(this), 100);
    };

    Widget.prototype.select_feature = function select_feature(feature) {
        // this.selected_feature = feature;
        this.center_popup_menu(feature);
    };

    window.Widget = Widget;

})(MashupPlatform);
