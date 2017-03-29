## Introduction

Display a map using an image an a custom coordintes system

## Settings

## Wiring

### Data format

`PoI`:
    - `id` (required): `String` with the id of this PoI. This id must be unique
        on the context of the map widget.
    - `icon`: `String` with an icon URL. Only used for `Point` geometries. You
        can also provide an object with icon details:
        - `url` (required): `String` with an icon URL.
        - `anchor`: Two-dimesional `Array` defining the anchor for
            the icon using percentage units (float number between 0 and 1).
            Default value is `[0.5, 0.5]` (icon center).
        - `opacity`: Opacity of the icon. Default is `1`
        - `scale`: Scale to apply to the icon. Default is `1`
    - `style`: Object with the style to use for rendering the geometry:
        - `stroke`: Stroke style:
            - `color`: Color to use for the stroke
            - `width`: Stroke width. `0` by default
        - `fill`: Fill style:
            - `color`: Color to use for filling geometries
    - `location`: a GeoJSON geometry.
      e.g. `{"type": "Point", "coordinates": [125.6, 10.1]}`
	- `title`: `String` with the title to associate to this PoI.
    - `subtitle`: `String` with the title to associate to this PoI.
    - `infoWindow`: content (using HTML) associated with the PoI.
    - `tooltip`: WIP. Tooltip to display for this PoI on mouse hover.
    - `data`: Data associated with the point of interest, used by the **PoI
      selected** output endpoint.


### Input Endpoints

- **Insert/Update PoI**: Insert or update a Point of Interest. This endpoint
  supports sending just a PoI or severals through an array. See the Data format
  section for a complete description of the `PoI` data format.
- **Replace PoIs**: Replace all the rendered PoIs by the ones provided in the
  event.
- **Delete PoI**: Receives a PoI or a list of PoIs and removes them.

### Output Endpoints

- **PoI selected**: A PoI has been selected on the map.

## Usage

## Reference

- [FIWARE Mashup](https://mashup.lab.fiware.org/)

## Copyright and License

Apache2
