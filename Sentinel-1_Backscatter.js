// Author: M.Witt, EAGLE M.Sc., Uni Würzburg

// Short script to generate Sentinel-1 Backscatter Ratio Timeseries (at 25 Plots) for interpretation of Phenology in response to drought stress. 
// Relevant Paper: https://doi.org/10.1016/j.rse.2020.111814 

// Plots created from GPS data provided by Prof. Bernhard Schuldt (Ecophysiology & Vegetation Ecology, Uni Würzburg)
var plots = ee.FeatureCollection('users/wittmarius8/Plots_boundary');

// One relative Orbit does not intersect with all Plots, use 66 & 168 for full coverage (run script twice)
var rel_orbit = 66

// Get Sentinel-1 Image Collection
var S1_backscatter = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.eq('relativeOrbitNumber_start', rel_orbit)) 
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .filter(ee.Filter.eq('resolution_meters', 10))
        .filterBounds(plots) // Filter for the whole extent of all Plots, will be subset in the for-loop
        .filterDate('2017-01-01','2020-01-01'); // We are interested in the Years 2017-2019

// Check resulting ImageCollection
print('S-1 Collection', S1_backscatter);

// Backscatter Ratio function 
var backscatter_ratio = function(image){
  var ratio = image.expression(
    "VV - VH", // This works instead of VV/VH, because backscatter intensities are log-transformed to db-scale.
    {
      VV: image.select('VV'),
      VH: image.select('VH'),
    }).rename('VV/VH')
  return image.addBands(ratio)
};

// Map the Ratio Function over Sentinel-1 Image Collection 
var S1_backscatter_2 = S1_backscatter.map(backscatter_ratio);
// Check a resulting image
print('Ratio Image', S1_backscatter_2.first());

// Iterate i times for each Plot (Feature in Feature Collection)
var regions = plots.toList(plots.size())
var regionCount = plots.size().evaluate(function (count) {
  for (var i = 0; i < count; i++) {
    var plotNDVI = ui.Chart.image.seriesByRegion({
      imageCollection:S1_backscatter_2,
      regions: ee.FeatureCollection([ee.Feature(regions.get(i))]),
      reducer: ee.Reducer.mean(),
      xProperty: 'system:time_start',
      band: 'VV/VH'})
      
    print(plotNDVI);    
  }
})

// Download .csv files for each Plot after visual inspection.
// The Graphs are in ascending Order (Plot-ID 1-25)
// The following Time Series interpolation and decomposition was done in R.