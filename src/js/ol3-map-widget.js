/* globals ol, StyledElements */

(function () {

    "use strict";

    var internalUrl = function internalUrl(data) {
        var url = document.createElement("a");
        url.setAttribute('href', data);
        return url.href;
    };

    var CORE_LAYERS = {
        OSM: new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
    };
    CORE_LAYERS.GOOGLE_STANDARD = CORE_LAYERS.MAPQUEST_ROAD;
    CORE_LAYERS.GOOGLE_HYBRID = CORE_LAYERS.MAPQUEST_HYBRID;
    CORE_LAYERS.GOOGLE_SATELLITE = CORE_LAYERS.MAPQUEST_SATELLITE;

    var build_basic_style = function build_basic_style(options) {
        if (options == null) {
            options = {};
        }

        if (options.image == null) {
            options.image = new ol.style.Icon({
                anchor: [0.5, 46],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                opacity: 0.75,
                src: internalUrl('images/icon.png')
            });
        }

        return new ol.style.Style({
            image: options.image,
            stroke: new ol.style.Stroke({
                color: 'blue',
                width: 3
            }),
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.1)'
            })
        });
    };

    // Create the default Marker style
    var DEFAULT_MARKER = build_basic_style();

    var Widget = function Widget() {
        this.layers_widget = null;
        this.base_layer = null;
        this.layers = {};
    };

    Widget.prototype.init = function init(initial_layer) {

        var button = document.getElementById('button');
        if (button != null) {
            button.addEventListener('click', function (event) {
                if (this.layers_widget == null) {
                    this.layers_widget = MashupPlatform.mashup.addWidget('CoNWeT/layer-selector/0.3', {refposition: event.target.getBoundingClientRect()});
                    this.layers_widget.outputs.layerInfoOutput.connect(MashupPlatform.widget.inputs.layerInfo);
                }
            });
        }

        this.vector_source = new ol.source.Vector({});
        this.vector_layer = new ol.layer.Vector({source: this.vector_source, style: DEFAULT_MARKER});
        this.map = new ol.Map({
            target: document.getElementById('map'),
            layers: [
                initial_layer,
                this.vector_layer
            ],
            view: new ol.View({
                center: [0, 0],
                minZoom: MashupPlatform.prefs.get('minzoom'),
                zoom: parseInt(MashupPlatform.prefs.get('initialZoom'), 10)
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

        this.base_layer = initial_layer;
        this.geojsonparser = new ol.format.GeoJSON();
    };

    Widget.prototype.registerPoI = function registerPoI(poi_info) {
        var iconFeature, style;
        iconFeature = this.vector_source.getFeatureById(poi_info.id);

        if (iconFeature == null) {
            iconFeature = new ol.Feature();
            iconFeature.setId(poi_info.id);
            this.vector_source.addFeature(iconFeature);
        }

        iconFeature.set('data', poi_info.data);
        iconFeature.set('title', poi_info.title);
        iconFeature.set('content', poi_info.infoWindow);
        var geometry, projection = 'EPSG:4326';
        if ('location' in poi_info) {
            geometry = this.geojsonparser.readGeometry(poi_info.location);
        } else {
            geometry = new ol.geom.Point([poi_info.currentLocation.lng, poi_info.currentLocation.lat]);
        }
        if (!(this.base_layer.getSource() instanceof ol.source.ImageStatic)) {
            geometry = geometry.transform(projection, this.map.getView().getProjection().getCode());
        }
        iconFeature.setGeometry(geometry);

        if (typeof poi_info.icon === 'string') {
            style = build_basic_style({
                image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
                    anchor: [0.5, 0.5],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    opacity: 1,
                    src: poi_info.icon,
                    scale: 1
                }))
            });
        } else if (typeof poi_info.icon === 'object') {
            style = build_basic_style({
                image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
                    anchor: poi_info.icon.anchor,
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    opacity: poi_info.opacity || 1,
                    src: poi_info.icon.src,
                    scale: poi_info.icon.scale || 1
                }))
            });
        } else if (poi_info.style != null) {
            var stroke, fill;

            if (poi_info.style.stroke != null) {
                stroke = new ol.style.Stroke({
                    color: poi_info.style.stroke.color,
                    width: poi_info.style.stroke.width
                });
            }

            if (poi_info.style.fill != null) {
                fill = new ol.style.Fill({
                    color: poi_info.style.fill
                });
            }

            style = new ol.style.Style({
                stroke: stroke,
                fill: fill
            });
        } else {
            style = DEFAULT_MARKER;
        }
        iconFeature.setStyle(style);
    };

    Widget.prototype.removePoI = function removePoI(poi_info) {
        var feature = this.vector_source.getFeatureById(poi_info.id);

        if (feature != null) {
            this.vector_source.removeFeature(feature);
        }
    };

    Widget.prototype.createWMSLayer = function createWMSLayer(layer_info) {
        var params = {
            'LAYERS': layer_info.name,
            'VERSION': layer_info.version
        };

        var service_url = new URL(layer_info.url);
        if (document.location.protocol === 'https:' && service_url.protocol !== 'https:') {
            service_url = MashupPlatform.http.buildProxyURL(service_url.href);
        } else {
            service_url = layer_info.url;
        }

        return new ol.layer.Image({
            extent: layer_info.extent,
            crossOrigin: 'anonymous',
            source: new ol.source.ImageWMS({
                url: service_url,
                params: params,
                projection: layer_info.projection
            })
        });
    };

    Widget.prototype.createStaticLayer = function createWMSLayer(layer_info) {
        var url = new URL(layer_info.url);
        if (document.location.protocol === 'https:' && url.protocol !== 'https:') {
            url = MashupPlatform.http.buildProxyURL(url.href);
        } else {
            url = layer_info.url;
        }

        var projection;
        if (typeof layer_info.projection === "string") {
            projection = ol.proj.get(layer_info.projection);
        } else {
            projection = new ol.proj.Projection({
                code: 'one-m2m-map',
                units: 'pixels',
                extent: layer_info.extent
            });
        }

        var layer = new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: url,
                projection: projection,
                imageExtent: layer_info.extent
            })
        });
        layer.projection = projection;
        layer.extent = layer_info.extent;

        return layer;
    };

    Widget.prototype.addLayer = function addLayer(layer_info) {
        var layer;
        switch (layer_info.type) {
        case "static":
            layer = this.createStaticLayer(layer_info);
            this.map.addLayer();
            this.layers[layer_info.id] = layer;
            break;
        case "wms":
        default:
            layer = this.createWMSLayer(layer_info);
            this.map.addLayer(layer);
            this.layers[layer_info.url + '#' + layer_info.name] = layer;
        }
    };

    Widget.prototype.removeLayer = function removeLayer(layer_info) {
        var layer_id = layer_info.url + '#' + layer_info.name;
        if (layer_id in this.layers) {
            this.map.removeLayer(this.layers[layer_id]);
            delete this.layers[layer_id];
        }
    };

    Widget.prototype.setBaseLayer = function setBaseLayer(layer_info) {
        if (this.base_layer != null) {
            this.map.removeLayer(this.base_layer);
            this.base_layer = null;
        }
        var layer;
        switch (layer_info.type) {
        case "core":
            if ('id' in layer_info && !(layer_info.id in CORE_LAYERS)) {
                throw new TypeError('Invalid layer id');
            }

            layer = CORE_LAYERS[layer_info.id];
            break;
        case "static":
            layer = this.createStaticLayer(layer_info);
            break;
        case "wms":
        default:
            layer = this.createWMSLayer(layer_info);
        }
        this.base_layer = layer;
        this.map.getLayers().insertAt(0, this.base_layer);

        if (layer_info.type === "static") {
            this.map.setView(new ol.View({
                projection: this.base_layer.projection,
                extent: this.base_layer.extent,
                center: ol.extent.getCenter(this.base_layer.extent)
            }));
            if (this.map.getView().getZoom() == null) {
                this.map.getView().setZoom(parseInt(MashupPlatform.prefs.get('initialZoom'), 10));
            }
        }
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
            var marker_coordinates, marker_position, marker_image, refpos;

            marker_coordinates = ol.extent.getCenter(feature.getGeometry().getExtent());
            marker_position = this.map.getPixelFromCoordinate(marker_coordinates);
            marker_image = feature.getStyle().getImage();
            if (marker_image != null) {
                var marker_scale = marker_image.getScale();
                var marker_size = marker_image.getSize().map(function (value) {
                    return value * marker_scale;
                });
                refpos = {
                    top: marker_position[1] - marker_size[1],
                    left: marker_position[0] - (marker_size[0] / 2),
                    width: marker_size[0],
                    height: marker_size[1]
                };
            } else {
                refpos = {
                    top: marker_position[1],
                    left: marker_position[0],
                    width: 0,
                    height: 0
                };
            }
            this.selected_feature = feature;
            this.popover.show(refpos);
        }.bind(this), 100);
    };

    Widget.prototype.select_feature = function select_feature(feature) {
        // this.selected_feature = feature;
        this.center_popup_menu(feature);

        if (MashupPlatform.widget.outputs.selectedPoI.connected) {
            var poi_info = {
                id: feature.getId(),
                title: feature.get('title'),
                data: feature.get('data'),
                infoWindow: feature.get('content'),
                currentLocation: {
                    lat: feature.H.geometry.B[0],
                    lng: feature.H.geometry.B[1]
                }
            };
            MashupPlatform.wiring.pushEvent('selectedPoI', JSON.stringify(poi_info))
        }
    };

    window.Widget = Widget;

})();
