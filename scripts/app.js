class Map {
  constructor($element, view, zoom) {
    this.$element = $element;
    this.view = view;
    this.zoom = zoom;
    this.map = null;
    this.control = null;
    this.circles = [];
    this.circleLayer = null;
  }

  init() {
    this.configure();
    this.bind();
  }

  configure() {
    this.map = L.map(this.$element).setView(this.view, this.zoom);
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGVudHoiLCJhIjoiUnBkdWZzNCJ9.ovWKLONuOBtQKiwprgGmzw').addTo(this.map);

    this.control = L.Routing.control({
      waypoints: [
        L.latLng(51.464675, -0.115138),
        L.latLng(51.498551, -0.104197),
      ],
      routeWhileDragging: true,
      lineOptions: {
        styles: [{color: '#31708f', opacity: .8, weight: 2}]
      },
      geocoder: L.Control.Geocoder.nominatim(),
      itineraryClassName: 'fuck',
    }).addTo(this.map);
  }

  bind() {
    this.control.on('routeselected', this.processRoute.bind(this));
  }

  processRoute(e) {
    if(this.circleLayer) {
      this.map.removeLayer(this.circleLayer);
      this.circles = [];
    }

    const routePoints = Array.from(e.route.coordinates);
    routePoints.forEach(point => {
      const endPoint = `http://api.erg.kcl.ac.uk/AirQuality/Data/Nowcast/lat=${point.lat}/lon=${point.lng}/Json`;
      fetch(endPoint)
        .then(blob => blob.json())
        .then(data => this.addDataPoint(data))
        .then(circle => this.addPoints());
    });
  }

  addPoints() {
    this.circleLayer = L.layerGroup(this.circles);
    this.map.addLayer(this.circleLayer);
  }

  addDataPoint(data) {
    data = data.PointResult;

    const lat = data['@lat'];
    const lon = data['@lon'];

    const maxIndex = Number(data['@Max_Index']);
    let fillColor;
    let color;

    if(maxIndex <= 3) {
      fillColor = '#dff0d8';
      color = '#3c763d'
    } else if (maxIndex <= 6) {
      fillColor = '#fcf8e3';
      color = '#8a6d3b';
    } else {
      fillColor = '#f2dede';
      color = '#a94442';
    }

    const popup = `<dl class="popup">
      <dt class="popup__title ${ Number(data['@NO2']) <= Number(data['@NO2_Annual']) ? 'popup__title--below' : 'popup__title--above' }">NO2:</dt><dd>${Number(data['@NO2']).toFixed(2)} ug/m3 (Annual avg. ${Number(data['@NO2_Annual']).toFixed(2)} ug/m3)</dd><br>
      <dt class="popup__title ${ Number(data['@PM10']) <= Number(data['@PM10_Annual']) ? 'popup__title--below' : 'popup__title--above' }">PM10:</dt><dd>${Number(data['@PM10']).toFixed(2)} ug/m3 (Annual avg. ${Number(data['@PM10_Annual']).toFixed(2)} ug/m3)</dd><br>
      <dt class="popup__title ${ Number(data['@PM25']) <= Number(data['@PM25_Annual']) ? 'popup__title--below' : 'popup__title--above' }">PM25:</dt><dd>${Number(data['@PM25']).toFixed(2)} ug/m3 (Annual avg. ${Number(data['@PM25_Annual']).toFixed(2)} ug/m3)</dd><br>
    </dl>`;

    this.circles.push(L.circle([lat, lon], 15, {fillColor, color, opacity: .6, fillOpacity:.8 })
      .bindPopup(popup));
  }
}

class Info {
  constructor($element) {
    this.$element = $element;
    this.selectors = { heading: '.js-info-heading', body: '.js-info-body' };
    this.species = null;
  }

  init() {
    this.configure();
  }

  configure() {
    this.species = this.$element.dataset.speciesCode;
    this.getInfo();
  }

  getInfo() {
    const endPoint = `http://api.erg.kcl.ac.uk/AirQuality/Information/Species/SpeciesCode=${this.species}/json`;
    fetch(endPoint)
        .then(blob => blob.json())
        .then(data => this.render(data));
  }

  render(data) {
    data = data.AirQualitySpecies.Species;
    const $heading = this.$element.querySelector(this.selectors.heading);
    const $body = this.$element.querySelector(this.selectors.body);
    $heading.innerHTML = data['@SpeciesName'];

    const description =  `<p>${data['@Description']}</p>`;
    const health = `<div class="alert alert-danger" role="alert"><p>${data['@HealthEffect']}<p><a href="${data['@Link']}">Find out more</a></div>`;

    $body.innerHTML= `${description}${health}`;
  }
}

class Alert {
  constructor($element) {
    this.$element = $element;
    this.lat = null;
    this.lng = null;
  }

  init() {
    if ("geolocation" in navigator) {
      this.configure();
    } else {
      return;
    }
  }

  configure() {
    this.getLocation()
      .then(coords => {
          this.lat = coords[0];
          this.lng = coords[1];
        })
      .then(data => this.getStatus());
  }

  getLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(position => {
        resolve([position.coords.latitude, position.coords.longitude]);
      });
    });
  }

  getStatus() {
    const endPoint = `http://api.erg.kcl.ac.uk/AirQuality/Data/Nowcast/lat=${this.lat}/lon=${this.lng}/Json`;
    fetch(endPoint)
      .then(blob => blob.json())
      .then(data => this.render(data));
  }

  render(data){
    const maxIndex = data.PointResult['@Max_Index'];
    let alert;

    if(maxIndex <= 3) {
      alert = `<div class="alert alert-success" role="alert"><p>Pollution levels are currently <strong>LOW</strong> where you are 👌</p></div>`

    } else if (maxIndex <= 6) {
      alert = `<div class="alert alert-warning" role="alert"><p>Pollution levels are currently <strong>MODERATE</strong> where you are 🤔</p></div>`
    } else {
      alert = `<div class="alert alert-warning" role="alert"><p>Pollution levels are currently <strong>HIGH</strong> where you are 😱😷👎😭</p></div>`
    }

    this.$element.innerHTML = alert;
  }
}

{
  console.log('hello world 😷');

  const map = new Map('map', [51.505, -0.09], 13);
  map.init();

  const infos = Array.from(document.querySelectorAll('.js-info'));
  infos.forEach(info => {
    const speciesInfo = new Info(info);
    speciesInfo.init();
  });

  const alertElement = document.querySelector('.js-alert');
  const alert = new Alert(alertElement);
  alert.init();
}
