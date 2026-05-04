# PROVNA-Viewer

Web application for visualizing and analyzing PROVNA data on Ellipsis Drive. Built with MapLibre GL, Apache ECharts, and Esri Calcite Components, it provides tools to navigate the map, query predictive layers, and enrich user-uploaded point data.

## Main Features
- Basemap selector (satellite, OpenStreetMap, dark) with navigation and scale controls.
- Display of PROVNA predictive layers (Pred 55 and Pred 1600), with year selection (2018-2024) and opacity/selection-color controls.
- Point inspection: click on the map or enter coordinates to retrieve the cluster/ecoregion and view a time-series chart.
- EcoPath button to open the dedicated variable view for the selected point.
- CSV point upload (`lat`/`lon` or `latitude`/`longitude` columns), automatic enrichment with the ecoregion value, and data download as XLSX or GeoJSON.
- Dynamic popup and marker handling to make exploration easier.

## Tech Stack
- MapLibre GL JS for the map.
- Ellipsis JS for raster/vector layers.
- Esri Calcite Components for the interface.
- Apache ECharts for charts, and PapaParse/SheetJS for file handling.

## Packaging
Generate the WAR file with:

```bash
& "C:\Users\a.dilorenzo\Sviluppo\Java\jdk-16_windows-x64_bin\jdk-16\bin\jar.exe" cvf gis_provna_viewer.war *
```
