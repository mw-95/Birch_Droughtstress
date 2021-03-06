// Author: M.Witt, EAGLE M.Sc., Uni Würzburg

// Short script to generate Sentinel-2 NDVI timeseries (at 25 Plots) for interpretation in response to drought stress. 

// Plots created from GPS data provided by Prof. Bernhard Schuldt (Ecophysiology & Vegetation Ecology, Uni Würzburg)
var plots = ee.FeatureCollection('users/wittmarius8/Plots_boundary');

// Importing Rodrigo Pricipes geetols cloud_mask function
var cld = require('users/fitoprincipe/geetools:cloud_masks')

// Set cloud coverage treshold for pre-filtering
var coverage = 60

// Get Sentinel-2 Image Collection
var S2sr = ee.ImageCollection("COPERNICUS/S2_SR")
              .filterBounds(plots)
              .filterDate('2017-01-01', '2020-01-01') // We are interested in the Years 2017-2019.
              .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT', coverage)); // Pre-Filter very cloudy images to speed up processing.

// Check the resulting ImageCollection
print('S-2 Collection', S2sr);

// Cloud Masking with the SCL-Band using Rodrigo Principes geetools code, found here:
// https://gis.stackexchange.com/questions/333883/removing-clouds-from-sentinel-2-surface-reflectance-in-google-earth-engine
var cloudmask = function(image){
  return cld.sclMask(['cloud_low', 'cloud_medium', 'cloud_high', 'shadow'])(image)
};

// Even after Cloud Masking, timeseries is not free of cloud artefacts (Due to 20m resolution of the SLC-Band, but 10m Bands)
var S2sr_masked = S2sr.map(cloudmask);

// Function to add NDVI-Band to Sentinel-2 ImageCollection
var ndvi  = function(image){
  var ndvi_var = image.normalizedDifference(['B8', 'B4'])
  return image.addBands(ndvi_var.rename('NDVI'))
};

// Map NDVI-function on the ImageCollection
var S2sr_masked_ndvi = S2sr_masked.map(ndvi);

// Check the resulting ImageCollection
print('S-2 NDVI', S2sr_masked_ndvi);

// Iterate i times (create one Graph for each Plot)
var regions = plots.toList(plots.size())
var regionCount = plots.size().evaluate(function (count) {
  for (var i = 0; i < count; i++) {
    var S2sr_masked_ndvi_2 = S2sr_masked_ndvi.filterBounds(regions.get(i))
    var plotNDVI = ui.Chart.image.seriesByRegion({
      imageCollection:S2sr_masked_ndvi,
      regions: ee.FeatureCollection([ee.Feature(regions.get(i))]),
      reducer: ee.Reducer.mean(),
      xProperty: 'system:time_start',
      band: 'NDVI'})
      
    print(plotNDVI);    
  }
})

// Download .csv files after visual interpretation of the results.
// Savitzky-Golay filter is only implemented pixel-wise, which is not useful to us.
// Because of that, filtering, subsetting to summer months and fitting a trendline is done in R. 