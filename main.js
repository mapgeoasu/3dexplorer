// JS for the map
require(["esri/Map", "esri/views/SceneView", "esri/WebScene", "esri/layers/SceneLayer", "esri/tasks/support/Query",
  "esri/widgets/Home", "esri/geometry/Extent"], function(
  Map,
  SceneView,
  WebScene,
  SceneLayer,
  Query,
  Home,
  Extent      
) { 
  // Important variables for connecting the sceneview to the AGOL API  
  // Service URL for the maps_master table on AGOL    
  var tableURL = "https://services3.arcgis.com/0OPQIK59PJJqLK0A/ArcGIS/rest/services/maps_master/FeatureServer/0/";
  // Title for the Cabinets Layer
  var cabTitle = "Map Cabinets Update - Map Cabinets";
  // Title for the Bookshelves layer
  var shelfTitle = "Bookshelves Update - Bookshelves";       
 
  // setup the variable for highlight with no value  
  var highlight = null;  

  // Load webscene from portal item
  var webscene = new WebScene({
    portalItem: {
      // autocasts as new PortalItem()
      id: "78d7af4d3b524ddda205fe1c542c52ac" // this is the id of the sceneview the app is connected to
    }
  });   

  var view = new SceneView({
    container: "viewDiv",
    highlightOptions: {
      color: [210, 49, 83] // color of the highlight when a feature is selected
    }, 
    map: webscene,          
    //zoom: 21,
    /*camera: {
      position: {
        latitude: 33.41905660,
        longitude: -111.93427050,
        z: 26.78385
      },
      tilt: 67.13,
      heading: 338.63
    }*/
  });    

 /* view.constraints = {
    geometry: {            // Constrain lateral movement to Lower Manhattan
      type: "extent",
      xmin: -111.9345778519999,
      ymin:  33.41921250900003,
      xmax: -111.93427068599996,
      ymax:  33.419464501000036,
      zmin: 8.055864,
      zmax: 10.646664
    },
    minScale: 500000,      // User cannot zoom out beyond a scale of 1:500,000
    maxScale: 0,           // User can overzoom tiles
    rotationEnabled: true // Disables map rotation
  };    */
  
  // Dock the popup to a fixed position
  view.popup.dockOptions = {
    // Disable the dock button so users cannot undock the popup
    buttonEnabled: false,
    // Dock the popup when the size of the view is less than or equal to 600x1000 pixels
    breakpoint: {
      width: 10000,
      height: 10000
    }
  };

  // setup a new viewer to display the map scans
  var viewer = new Viewer(document.getElementById('image'), {
    navbar: false,
    inline: false,
    toolbar: {
      zoomIn: 1,
      zoomOut: 1,
      oneToOne: 1,
      reset: 1,
      prev: 0,
      play: {
        show: 1,
        size: 'large',
      },
      next: 0,
      rotateLeft: 1,
      rotateRight: 1,
      flipHorizontal: 1,
      flipVertical: 1,
    },
    viewed() {
      viewer.zoomTo(1);
    },
  });  

  // when the user clicks on the thumbnail in the popup launch the viewer
  $(document).on('click','.thumbdisplay', function(){
    viewer.show();
  });
  
  // Creates a new table to hold our map attributes  
  var table = new Tabulator("#drawers-table", {             
      height: 350,            
      selectable: 1,
      clipboard:true, //enable clipboard functionality              
      columns:[
          {title:"Title", field:"attributes.TITLE", width: 500},
          {title:"Author", field:"attributes.AUTHOR", width: 300},
          {title:"Publisher", field:"attributes.PUBLISHER", width: 300},
          {title:"Publication Date", field:"attributes.DATE", width: 150},
          {title:"Scale", field:"attributes.SCALE", width: 120},
          {title:"Catalog Item", field:"attributes.CATALOG_LINK", width: 400, formatter:"link", formatterParams:{                   
             target:"_blank",
          }},
          {title:"Call Number", field:"attributes.CALL_NUM", width: 250},                                
          {title:"Language", field:"attributes.LANG", width: 150},
          {title:"Theme", field:"attributes.THEME", width: 150},
          {title:"Region / Geography", field:"attributes.GEO", width: 200},                
          {title:"Drawer ID", field:"attributes.LOC_ID", width: 120},                         
      ],            
      // Detect when someone clicks on a row in the table
      rowClick:function(e, row){ 
        view.popup.close();   
        // When the table row is clicked hide the table 
        $('#drawerModal').modal('hide');        
        //e - the click event object
        //row - row component
        // Get the attributes from the selected row in the table            
        var drawerId = row._row.data.attributes.LOC_ID;  
        var itemTitle = row._row.data.attributes.TITLE;
        var itemDate = row._row.data.attributes.DATE;
        var itemAuthor = row._row.data.attributes.AUTHOR;
        var itemLink = row._row.data.attributes.CATALOG_LINK;
        var itemPub =  row._row.data.attributes.PUBLISHER;
        var itemScale =  row._row.data.attributes.SCALE;
        var itemNum =  row._row.data.attributes.CALL_NUM;
        var thumbUrl = row._row.data.attributes.THUMB_URL; 
        // if the item has no scale leave it blank
        if (itemScale == '' || itemScale == null) {
          itemScale = " ";
        }  
              
        console.log('you clicked a row'); 
        if (drawerId < 241) {
          // Get the cabinets layer from webScene
          var cabLayer = webscene.allLayers.filter(function(elem) {
            return elem.title === cabTitle;
          }).items[0];        
          var query = cabLayer.createQuery();
          // Query the cabinets layer for the LOC_ID
          query.where = "LOC_ID =" + "'" + drawerId + "'";
          query.returnGeometry = true;               
          query.returnZ = true;
          query.outFields = ["OBJECTID", "LOC_ID", "Z_Min", "Z_Max"];
          cabLayer.queryFeatures(query)
            .then(function(response){
               // returns a feature set with features containing an OBJECTID
               var objectID = response.features[0].attributes.OBJECTID;
               //var cabId = response.features[0].attributes.CAB_ID;
               var zmin = (response.features[0].attributes.Z_Min / 3.28);
               var zmax = (response.features[0].attributes.Z_Max / 3.28);
              
               view.whenLayerView(cabLayer).then(function(layerView) {
                  var queryExtent = new Query({
                    objectIds: [objectID]
                  });
                  // zoom to the extent of drawer that is clicked on the table  
                  var new_ext = new Extent({
                    xmin: response.features[0].geometry.extent.xmin, 
                    ymin: response.features[0].geometry.extent.ymin, 
                    zmin: zmin,
                    xmax: response.features[0].geometry.extent.xmax, 
                    ymax: response.features[0].geometry.extent.ymax,
                    zmax: zmax,                        
                    spatialReference: { wkid: 4326 }
                  });

                  cabLayer.queryExtent(queryExtent).then(function(result) {
                    view.goTo(new_ext.expand(3), { speedFactor: 0.5 });                        
                  });
                  
                  // if any, remove the previous highlights
                  if (highlight) {
                    highlight.remove();
                  }
                  // highlight the feature with the returned objectId
                  highlight = layerView.highlight([objectID]);
                  })
                  // check if the clicked record has an existing image
                  if (thumbUrl !== '' && thumbUrl !== null) {
                    // change the image URL and title to display in the viewer
                    document.getElementById('image').src=thumbUrl;
                    document.getElementById('image').alt=itemTitle;
                    viewer.update();
                    
                    // open a popup at the drawer location of the selected map
                    view.popup.open({
                      // Set the popup's title to the coordinates of the clicked location
                      title: "<h6><b>" + itemTitle + "</b>",  
                      content: "<img src='" + thumbUrl + "' class='thumbdisplay'/><br><br><b>Title: </b>" + itemTitle +
                      "<br><br><b>Date: </b>" + itemDate + "<br><br><b>Author: </b>" + itemAuthor + "<br><br><b>Publisher: </b>" + 
                      itemPub + "<br><br><b>Scale: </b>" + itemScale + "<br><br><b>Call Number: </b>" + itemNum +
                      "<br><br><b>Physical Location: </b>Drawer " + drawerId + "<br><br><center><a href=" + "'" + itemLink + 
                      "' target='_blank' rel='noopener noreferrer'>View ASU Library Catalog Record</a></center>" +
                      "<br><br><a href='https://lib.asu.edu/geo/services' target='_blank' rel='noopener noreferrer'>Request more information</a>",
                      location: response.features[0].geometry.centroid, // Set the location of the popup to the clicked location 
                      actions: [returnToAction]      
                    });                    
                  } else {
                    view.popup.open({
                      // Set the popup's title to the coordinates of the clicked location
                      title: "<h6><b>Drawer ID: "  + drawerId + "</b>",  
                      content: "The item " + '<b>"' + itemTitle + '"</b> ' + "is located in Drawer " + drawerId + ".",
                      location: response.features[0].geometry.centroid, // Set the location of the popup to the clicked location 
                      actions: [returnToAction]      
                    });
                  }
             });           
      } else if (drawerId >= 241) {
        // Get the cabinets layer from webScene
          var shelfLayer = webscene.allLayers.filter(function(elem) {
            return elem.title === shelfTitle;
          }).items[0];        
          var query = shelfLayer.createQuery();
          // Query the cabinets layer for the LOC_ID
          query.where = "LOC_ID =" + "'" + drawerId + "'";
          query.returnGeometry = true;               
          query.returnZ = true;
          query.outFields = ["OBJECTID", "LOC_ID", "Z_Min", "Z_Max"];
          shelfLayer.queryFeatures(query)
            .then(function(response){
               // returns a feature set with features containing an OBJECTID
               var objectID = response.features[0].attributes.OBJECTID;
               //var cabId = response.features[0].attributes.CAB_ID;
               var zmin = (response.features[0].attributes.Z_Min / 3.28);
               var zmax = (response.features[0].attributes.Z_Max / 3.28);
              
               view.whenLayerView(shelfLayer).then(function(layerView) {
                  var queryExtent = new Query({
                    objectIds: [objectID]
                  });
                  // zoom to the extent of drawer that is clicked on the table  
                  var new_ext = new Extent({
                    xmin: response.features[0].geometry.extent.xmin, 
                    ymin: response.features[0].geometry.extent.ymin, 
                    zmin: zmin,
                    xmax: response.features[0].geometry.extent.xmax, 
                    ymax: response.features[0].geometry.extent.ymax,
                    zmax: zmax,                        
                    spatialReference: { wkid: 4326 }
                  });

                  shelfLayer.queryExtent(queryExtent).then(function(result) {
                    view.goTo(new_ext.expand(3), { speedFactor: 0.5 });                        
                  });
                  
                  // if any, remove the previous highlights
                  if (highlight) {
                    highlight.remove();
                  }
                  // highlight the feature with the returned objectId
                  highlight = layerView.highlight([objectID]);
                  })
                  // open a popup at the drawer location of the selected map
                  view.popup.open({
                    // Set the popup's title to the coordinates of the clicked location                          
                    title: "<h6><b>Shelf ID: "  + drawerId + "</b>", 
                    content: "The item " + '"<b>' + row._row.data.attributes.TITLE + '</b>" ' + "is located in Shelf " + drawerId + ".",
                    location: response.features[0].geometry.centroid,// Set the location of the popup to the clicked location  
                    actions: [returnToAction]      
                  });
             });
      }   
    }
  });        
  
  //trigger download of mapdata.csv file
  $("#download").click(function(){
      table.download("csv", "mapdata.csv", {sheetName:"Map Data"});
  });        

  view.when(function() {
    // Get the cabinets layer from webScene
    var cabLayer = webscene.allLayers.filter(function(elem) {
      return elem.title === cabTitle;
    }).items[0];
    // get the LOC_ID and DRAWER_TITLE  
    cabLayer.outFields = ['LOC_ID', 'DRAWER_TITLE'];

    // Get the bookshelves layer from webScene
    var shelfLayer = webscene.allLayers.filter(function(elem) {
      return elem.title === shelfTitle;
    }).items[0];
    // get the LOC_ID and DRAWER_TITLE  
    shelfLayer.outFields = ['LOC_ID'];

    // retrieve the layer view of the scene layer
    view.whenLayerView(cabLayer, shelfLayer)
      .then(function(cabLayerView, shelfLayerView) {
        view.on("click", function(event) { 
          // if any, remove the previous popup actions
          view.popup.actions = [];
          // if any, remove the previous highlights
          if (highlight) {
            highlight.remove();
          }

          view.hitTest(event, { include: [cabLayer, shelfLayer] }).then(function(response) {            
            // check if a feature is returned from the cabLayer
            if (response.results.length) {                                 
              $(".esri-icon-table").hide();
              $("#drawerTitle").hide();
              const graphic = response.results[0].graphic;
              console.log(graphic.attributes);
              // Get the LOC_ID of the clicked drawer
              var drawerId = graphic.attributes.LOC_ID;
              var drawerTitle = graphic.attributes.DRAWER_TITLE;               

              console.log(drawerId);
              // Call to the ArcGIS REST API to retreive the maps in each drawer
              $.ajax({
                      dataType: 'json',
                      url: tableURL + 'query?where=LOC_ID+%3D+' + drawerId + '&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
                      type: "GET",    
                      success: function(data) {
                       if (data.features.length <= 0) {
                        cabLayer.popupTemplate = {
                            title: "<h6>Drawer ID: " + drawerId,
                            content: "Description: " + drawerTitle + "<br><br>Inventory coming soon!"                         
                         };
                         shelfLayer.popupTemplate = {
                            title: "<h6>Shelf ID: " + drawerId,
                            content: "Description: " + "N/A" + "<br><br>Inventory coming soon!"                         
                         };
                         //$('#noDataModal').modal('show');
                         //view.popup.close();
                       } else {
                         // show the cabinet info div
                         $("#drawerTitle").show(); 
                         $("#maxResults").hide();
                         console.log(data.features);
                         // Get the features from the REST API 
                         var features = data.features;     
                         //$('#drawerModal').modal('show');                            
                         var numResults = data.features.length;
                         var startCallNo = data.features[0].attributes.CALL_NUM;
                         var endCallNo = data.features[numResults - 1].attributes.CALL_NUM;   
                         var shelfName = data.features[0].attributes.LOC_TYPE;  
                         if (drawerId >= 241) {
                            $('#drawerTitle').html("Shelf " + drawerId + ": " + shelfName);
                          } else {
                            $('#drawerTitle').html("Drawer " + drawerId + ": " + drawerTitle);
                          }                                        
                         cabLayer.popupTemplate = {
                            title: "<b><h6>Drawer ID: " + drawerId + "</b>" ,
                            content: "<h6>Description: "  + drawerTitle + "<br><br> Item Count: " + numResults +
                            "<br><br>Range: " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                         };

                         shelfLayer.popupTemplate = {
                            title: "<b><h6>Shelf ID: " + drawerId + "</b>" ,
                            content: "<h6>Description: "  + shelfName + "<br><br> Item Count: " + numResults +
                            "<br><br>Range: " + startCallNo + " - " + endCallNo,           
                            actions: [tableViewerAction] // adds the custom popup action
                         };

                         $('#results').html(" | Item count: " + numResults + " items");  
                         // Create a new table with the array of features 
                         table.setData(features);                                 
                       }
                      }
              });   
            }
          });
      }); //end map click
    });
  }); // end of view   

  // Change the appearance of the popup based on which layer is selected
  view.when(function () {
    // Watch for when features are selected
    view.popup.watch("selectedFeature", function (graphic) {
      if (graphic) {
        if (graphic.layer.title == cabTitle || graphic.layer.title == shelfTitle) {
          $(function() {            
          $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '55px');                 
        });
        } else  if (graphic.layer.title != cabTitle || graphic.layer.title != shelfTitle) {
          $(function() {            
          $("body:not(.esriIsPhoneSize) #viewDiv .esri-popup.esri-popup--is-docked .esri-popup__main-container").css('padding-bottom', '0px');                
        });
        }              
      }
    })
  });

  // Code for the search bar functions
  $( "#submit" ).click(function() {
    view.popup.close();
   // $(".esri-icon-table").show();
    // get the value of the search box
    var searchVal = $( "#search" ).val();
    // get the value of the search type dropdwn
    var typeVal = $( "#searchtype" ).val();
    if (typeVal == 'Keyword') {
      // call to query the REST API using the value of the search
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=TITLE+LIKE+%27%25' + searchVal + '%25%27+OR+THEME+LIKE+%27%25' + searchVal + '%25%27+OR+Geo+LIKE+%27%25' + searchVal +'%25%27+OR+DATE+LIKE+%27%25' + searchVal + '%25%27+OR+PUBLISHER+LIKE+%27%25' + searchVal + '%25%27+OR+AUTHOR+LIKE+%27%25' + searchVal + '%25%27+OR+SCALE+LIKE+%27%25' + searchVal + '%25%27+OR+LANG+LIKE+%27%25' + searchVal + '%25%27+OR+TAGS+LIKE+%27%25' + searchVal + '%25%27&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
               if (data.features.length == 0) {
                alert('The search returned no results. Please try different terms.');
               } else {                     
                 // hide the cabinet info div
                 $("#drawerTitle").hide(); 
                 console.log(data.features);
                 // Get the features from the REST API 
                 var searchRes = data.features;  
                 $('#drawerModal').modal('show'); 
                 // Get the number of results of the search
                 var numResults = data.features.length;   
                 if (numResults >= 2000) {
                   $("#maxResults").show();
                 } else {
                  $("#maxResults").hide();
                 }
                 $('#results').html(numResults + " items found for " + '"' + searchVal + '"');                  
                 // Create a new table with the array of features 
                 table.setData(searchRes);
                }
              }
      });  
    } else if (typeVal == 'Call Number') {            
      // call to query the REST API using the value of the search
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=CALL_NUM+LIKE+%27%25' + searchVal + '%25%27&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
                $("#maxResults").hide();
                if (data.features.length == 0) {
                  alert('The search returned no results. Please try different terms.');
                } else {
                 // hide the cabinet info div
                 $("#drawerTitle").hide();  
                 console.log(data.features);
                 // Get the features from the REST API 
                 var searchRes = data.features;  
                 $('#drawerModal').modal('show');  
                 var numResults = data.features.length;    
                 $('#results').html(numResults + " items found for " + '"' + searchVal + '"');
                 // Create a new table with the array of features 
                 table.setData(searchRes);
                }
              }
      });  
    }   
  });

 // if users hits enter perform the search   
 $( "#search" ).keyup(function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("submit").click();
    }        
 }); 

  // Code for the search dropdown menu
  $("#searchtype").change(function () {
    // Get the value of the selected item
    var value = this.value;
    if (value == 'Keyword') {
      $('#search').attr("placeholder", "Search items...");
    } else if (value == 'Call Number') {
       $('#search').attr("placeholder", "Enter Call # (ie: G3300 1818 .H4 REF)");            
    } else if (value == 'Date') {
      //$('#yearModal').modal('show');
      $('#search').attr("placeholder", "Enter Year Range (Format: YYYY-YYYY)"); 
    } else if (value == 'Location') {            
      $('#search').attr("placeholder", "Search location (ie: Arizona)"); 
    } else if (value == 'Theme') {            
      $('#search').attr("placeholder", "Search by theme (ie: Land use)"); 
    } else if (value == 'Advanced') {
       
      $('#advancedModal').modal('show');
    }
  });

   // Code to populate the Advanced Search Dropdown Menus
   // Populate the Theme dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=THEME&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var themeSelect = document.getElementById('theme');
              var features = data.features;    
              Object.values(features).forEach(function(value) {
                if (value.attributes.THEME !== null) {                                         
                  var themeVal = value.attributes.THEME;
                  var themeOpt = document.createElement("option");
                  themeOpt.textContent = themeVal;
                  themeOpt.value = themeVal;
                  themeSelect.appendChild(themeOpt); 
                }                                        
              });                     
            }
    }); 

    /*// Populate the Location dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=GEO&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var geoSelect = document.getElementById('location');
              var features = data.features;    
              Object.values(features).forEach(function(value) { 
                if (value.attributes.GEO !== null) {                                         
                  var geoVal = value.attributes.GEO;
                  var geoOpt = document.createElement("option");
                  geoOpt.textContent = geoVal;
                  geoOpt.value = geoVal;
                  geoSelect.appendChild(geoOpt); 
                }                                        
              });                     
            }
    });   */
   // Populate the Language dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=LANG&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var langSelect = document.getElementById('language');
              var features = data.features;    
              Object.values(features).forEach(function(value) {
                if (value.attributes.LANG !== null) {                                          
                  var langVal = value.attributes.LANG;
                  var langOpt = document.createElement("option");
                  langOpt.textContent = langVal;
                  langOpt.value = langVal;
                  langSelect.appendChild(langOpt); 
                }                                        
              });                     
            }
    });
   // Populate the format dropdown item
   $.ajax({
            dataType: 'json',
            url: tableURL + 'query?where=1%3D1&objectIds=&time=&resultType=none&outFields=FORMAT&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=true&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
            type: "GET",    
            success: function(data) {
              var formatSelect = document.getElementById('format');
              var features = data.features;    
              Object.values(features).forEach(function(value) { 
                if (value.attributes.FORMAT !== null) {                                         
                  var formatVal = value.attributes.FORMAT;
                  var formatOpt = document.createElement("option");
                  formatOpt.textContent = formatVal;
                  formatOpt.value = formatVal;
                  formatSelect.appendChild(formatOpt); 
                }                                        
              });                     
            }
    });

  // Function to rotate the map
  function rotate() {         
    view.goTo({
        heading: view.camera.heading + 0.2,
        center: view.center
    }, {animate: false});
    // begin the rotation
    var req = requestAnimationFrame(rotate);            
    // when the user clicks on the pause button
    pauseBtn.addEventListener('click', function(event){  
      // cancel the rotation
      cancelAnimationFrame(req);
      $(".esri-icon-play").show(); 
      $(".esri-icon-pause").hide();     
    })
  }; 

  // Custom Buttons
  // Home button
  var homeBtn = new Home({
    view: view
  });

  // Add the home button to the top left corner of the view
  view.ui.add(homeBtn, "top-left");         
  
  // If the advanced search is closed, change the search value back to Keyword
  $('#advancedModal').on('hidden.bs.modal', function (e) {
    $('#searchtype')
      .val('Keyword')
      .trigger('change');
  })

  // Rotate play button
  var rotateBtn = document.createElement('div');        
  rotateBtn.className = "esri-icon-play esri-widget--button esri-widget esri-interactive";
  rotateBtn.title = "Auto-rotate map";
  rotateBtn.addEventListener('click', function(event){
    rotate();
    $(".esri-icon-play").hide();
    $(".esri-icon-pause").show();         
  })

  // Add the button to the UI
  view.ui.add(rotateBtn, "top-left");

  // Pause button
  var pauseBtn = document.createElement('div');
  pauseBtn.className = "esri-icon-pause esri-widget--button esri-widget esri-interactive";
  pauseBtn.title = "Pause rotation";

  // Add the button to the UI
  view.ui.add(pauseBtn, "top-left"); 

  $(".esri-icon-pause").hide();

  // Add element for the 360 photo viewer button using Esri widgets
  var viewerBtn = document.createElement('div');
  viewerBtn.className = "esri-icon-media esri-widget--button esri-widget esri-interactive";
  viewerBtn.title = "view 360 hub image";
  viewerBtn.addEventListener('click', function(event){
    // Toggle table
    $('#viewerModal').modal('show');
  })

  // Add the button to the UI
  view.ui.add(viewerBtn, "top-left"); 

  // Add element for the information button using Esri widgets
  var infoBtn = document.createElement('div');
  infoBtn.className = "esri-icon-description esri-widget--button esri-widget esri-interactive";
  infoBtn.title = "Information";
  infoBtn.addEventListener('click', function(event){
    // Toggle infowindow modal
    $('#infoModal').modal('show');
  })

  // Add the button to the UI
  view.ui.add(infoBtn, "top-left"); 

  /*// Add element for the table button using Esri widgets
  var tableBtn = document.createElement('div');
  tableBtn.className = "esri-icon-table esri-widget--button esri-widget esri-interactive";
  tableBtn.title = "Open table";
  tableBtn.addEventListener('click', function(event){
    // Toggle table
    $('#drawerModal').modal('show');
  })

  // Add the button to the UI
  view.ui.add(tableBtn, "top-left"); 
  // Hide the button by default  
  $(".esri-icon-table").hide();        */

  // when someone clicks the advanced search submit button        
  $("#advancedBtn").click(function(){
    view.popup.close();
    // create an empty array for search strings
    var searchStrings = [];
    // get the values of the boxes from the advanced search modal
    var themeVal = $("#theme").val();
    var langVal = $('#language').val();
    var geoVal = $("#location").val();
    var formatVal = $('#format').val();
    var authorVal = $('#author').val();
    var pubVal = $('#publisher').val();
    var startYearVal = $("#startYear").val();
    var endYearVal = $("#endYear").val();
    console.log(themeVal, langVal, geoVal, authorVal, pubVal, startYearVal, endYearVal);
    // if the search boxes are blank print error message
    if (themeVal == 'Select Theme' && langVal == 'Select Language' && geoVal == "" && authorVal == "" 
      && pubVal == "" && startYearVal == "" && endYearVal == "" && formatVal == 'Select Format') {
      alert('Please select or enter a value for at least one search field.')
    } else if (startYearVal != "" && endYearVal == "" || startYearVal == "" && endYearVal != "") {
      alert('Please enter a value for both Start Year and End Year');
    } else {
      if (themeVal != 'Select Theme') {              
        var themeString = "THEME = " + "'" + themeVal + "'"; 
        searchStrings.push(themeString);                      
      }
      if (langVal != 'Select Language') {              
        var langString = "LANG = " + "'" + langVal + "'"; 
        searchStrings.push(langString);                         
      }
      if (geoVal != "") {              
        var geoString = "GEO LIKE " + "'%" + geoVal + "%'";
        searchStrings.push(geoString);                   
      }
      if (formatVal != 'Select Format') {              
        var formatString = "FORMAT = " + "'" + formatVal + "'";
        searchStrings.push(formatString);                   
      }
      if (authorVal != "") {              
        var authorString = "AUTHOR LIKE " + "'%" + authorVal + "%'"; 
        searchStrings.push(authorString);                    
      }
      if (pubVal != "") {              
        var pubString = "PUBLISHER LIKE " + "'%" + pubVal + "%'"; 
        searchStrings.push(pubString);                      
      }
      if (startYearVal != "" && endYearVal != "" ) {              
        var dateString = "DATE BETWEEN " + "'" + startYearVal + "' AND " + "'" + endYearVal + "'";
        searchStrings.push(dateString);                    
      }
      // join the search strings from the array
      var queryString = searchStrings.join(" AND ");
      console.log(queryString);

      // call to the rest api with the search string
      $.ajax({
              dataType: 'json',
              url: tableURL + 'query?where=' + queryString + '&objectIds=&time=&resultType=none&outFields=*&returnHiddenFields=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson',
              type: "GET",    
              success: function(data) {
                console.log(data);
                var advancedRes = data.features;
                table.setData(advancedRes);  
                var numResults = advancedRes.length;
                if (numResults == 0) {
                  alert('The search returned no results. Please try different terms.');
                } else {
                  if (numResults >= 2000) {
                    $("#maxResults").show();
                  } else {
                    $("#maxResults").hide();
                  }   
                $('#results').html(numResults + " items found for advanced search");   
                $("#drawerTitle").hide();  
                $('#drawerModal').modal('show');
                $('#advancedModal').modal('hide'); 
                }                                                             
              }                     
          });       
    }      
  });

  // check if the years are valid numbers
  $('#startYear').change(function() {
    $(this).val($(this).val().match(/\d*\.?\d+/));
  });

  $('#endYear').change(function() {
    $(this).val($(this).val().match(/\d*\.?\d+/));
  });

  // Popup Actions        
  // remove the zoom-to popup action  
  view.popup.actions = [];
  // popup action for maps
  var tableViewerAction = {
    // This text is displayed as a tooltip
    title: "View item list",
    // The ID by which to reference the action in the event handler
    id: "view-table",
    // Sets the icon font used to style the action button
    className: "esri-icon-collection"
  };  

  var returnToAction = {
    // This text is displayed as a tooltip
    title: "Return to results",
    // The ID by which to reference the action in the event handler
    id: "return-to",
    // Sets the icon font used to style the action button
    className: "esri-icon-table"
  };   

  // This event fires for each click on any action
  view.popup.on("trigger-action", function(event){
    // If the view image action is clicked, open the table modal
    if(event.action.id === "view-table"){
      $('#drawerModal').modal('show');
      table.redraw(true);
    }
    if(event.action.id === "return-to"){
      $('#drawerModal').modal('show');  
      table.redraw(true);
    }
  }); 
}); // end of map JS
