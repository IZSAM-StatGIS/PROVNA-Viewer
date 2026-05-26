const moveIfPresent = (map, layerId) => {
	if (map.getLayer(layerId)) {
		map.moveLayer(layerId);
	}
};

const moveLayersByPrefix = (map, prefix) => {
	const style = map.getStyle();
	if (!style || !style.layers) return;

	style.layers
		.map((layer) => layer.id)
		.filter((id) => id.startsWith(prefix))
		.forEach((id) => map.moveLayer(id));
};

const enforceOverlayOrder = (map) => {
	if (!map || !map.getStyle()) return;

	// Target order (bottom -> top): pred layers, ws_line, boundaries, csv points.
	moveIfPresent(map, "predLayer");
	moveIfPresent(map, "predLayer_selection");
	moveLayersByPrefix(map, "ws_line_");
	moveLayersByPrefix(map, "boundaries_");
	moveIfPresent(map, "csv-points-outline");
	moveIfPresent(map, "csv-points");
};

export { enforceOverlayOrder };
