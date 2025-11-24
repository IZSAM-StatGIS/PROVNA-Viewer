# PROVNA-Viewer

Applicazione web per la visualizzazione e l'analisi dei dati PROVNA. Basata su MapLibre GL, Ellipsis JS ed Esri Calcite Components, offre strumenti per navigare la mappa, interrogare i layer predittivi e arricchire dati puntuali caricati dall'utente.

## Funzionalità principali
- Selettore di basemap (satellitare, OpenStreetMap, dark) con controlli di navigazione e scala.
- Visualizzazione dei layer predittivi PROVNA (Pred 55 e Pred 1600) con selezione dell'anno (2018‑2024) e regolazione dell'opacità/colore delle selezioni.
- Ispezione puntuale: click sulla mappa o inserimento di coordinate per ottenere il cluster/ecoregione e un grafico delle serie temporali.
- Pulsante EcoPath per aprire la visualizzazione dedicata delle variabili nel punto selezionato.
- Upload di punti in CSV (colonne `lat`/`lon` o `latitude`/`longitude`), arricchimento automatico con il valore di ecoregione e download dei dati in XLSX o GeoJSON.
- Gestione dinamica dei popup e del marker per facilitare l'esplorazione.

## Tech stack
- MapLibre GL JS per la mappa.
- Ellipsis JS per i layer raster/vettoriali.
- Esri Calcite Components per l'interfaccia.
- Apache ECharts per i grafici e PapaParse/SheetJS per la gestione dei file.

## Packaging
Generare il war con il comando:

```bash
& "C:\Users\a.dilorenzo\Sviluppo\Java\jdk-16_windows-x64_bin\jdk-16\bin\jar.exe" cvf gis_provna_viewer.war *
```
