// URLs das APIs
const weatherApiUrl = 'http://api.openweathermap.org/data/2.5/weather?appid=0313d39117e818dd945043a1cc830e8b&units=metric';
const forecastApiUrl = 'http://api.openweathermap.org/data/2.5/forecast?appid=0313d39117e818dd945043a1cc830e8b&units=metric';
const geoApiUrl = 'https://api.openweathermap.org/geo/1.0/direct?q=';
const geoApiKey = '0313d39117e818dd945043a1cc830e8b';

// Dicionário para tradução do clima
const weatherTranslation = {
    "clear sky": "Céu Limpo",
    "few clouds": "Poucas Nuvens",
    "scattered clouds": "Nuvens Dispersas",
    "broken clouds": "Nuvens Fragmentadas",
    "shower rain": "Chuva Rápida",
    "rain": "Chuva",
    "thunderstorm": "Tempestade",
    "snow": "Neve",
    "mist": "Neblina",
    "thunderstorm with rain": "Trovoada com Chuva",
    "light rain": "Chuva Fraca",
    "moderate rain" : "Chuva Moderada"
};

// Inicialização do mapa com OpenLayers
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM(),
        }),
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-47.9292, -15.7801]), // Centro inicial no Brasil
        zoom: 4,
    }),
});

// Função para calcular a fase da lua
function getMoonPhase(date) {
    const lunarMonth = 29.53; // Duração média do ciclo lunar em dias
    const newMoonDate = new Date(2000, 0, 6); // Data da Lua Nova em 2000

    const daysSinceNewMoon = (date - newMoonDate) / (1000 * 60 * 60 * 24);
    const moonPhaseIndex = Math.floor((daysSinceNewMoon % lunarMonth) / (lunarMonth / 5));

    const moonPhaseArray = [
        'Nova',               // Lua Nova
        'Crescente',          // Lua Crescente
        'Quarto_Crescente',   // Quarto Crescente
        'Cheia',              // Lua Cheia
        'Minguante'           // Lua Minguante
    ];

    return moonPhaseArray[moonPhaseIndex];
}

// Variável para controlar o alerta ativo
let activeAlert = null;

// Função para mostrar um alerta com SweetAlert2
function showAlert(icon, title, text) {
    if (activeAlert) {
        activeAlert.close();
    }
    activeAlert = Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonText: 'OK'
    });
}

// Função para buscar previsão do tempo atual
async function fetchWeatherData(city) {
    try {
        showLoadingIndicator(true);
        const response = await fetch(`${weatherApiUrl}&q=${city}`);
        const data = await response.json();
        if (data) {
            displayWeatherData(data);
            fetchForecastData(city);  // Busca a previsão para os próximos dias
        } else {
            showAlert('error', 'Cidade não encontrada', 'Tente novamente com um nome de cidade válido.');
        }
    } finally {
        showLoadingIndicator(false);
    }
}

// Função para buscar previsão do tempo para os próximos dias
async function fetchForecastData(city) {
    try {
        const response = await fetch(`${forecastApiUrl}&q=${city}`);
        const data = await response.json();
        if (data) {
            displayForecastData(data);
        } else {
            showAlert('error', 'Erro ao buscar previsão', 'Tente novamente mais tarde.');
        }
    } catch (error) {
        showAlert('error', 'Erro ao buscar previsão', 'Verifique sua conexão.');
    }
}

// Função para buscar coordenadas da cidade
async function fetchCityCoordinates(city) {
    try {
        showLoadingIndicator(true);
        const response = await fetch(`${geoApiUrl}${city}&appid=${geoApiKey}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            moveMapToCity(lat, lon);
        } else {
            showAlert('error', 'Localização não encontrada', 'Verifique o nome da cidade.');
        }
    } catch (error) {
        showAlert('error', 'Erro ao buscar coordenadas', 'Verifique sua conexão.');
    } finally {
        showLoadingIndicator(false);
    }
}

// Função para mover o mapa para a cidade encontrada
function moveMapToCity(lat, lon) {
    const view = map.getView();
    view.setCenter(ol.proj.fromLonLat([lon, lat]));
    view.setZoom(10);
}

// Função para exibir dados da previsão do tempo
function displayWeatherData(data) {
    const cityName = data.name; // Nome da cidade
    const currentDate = new Date().toLocaleDateString('pt-BR'); // Data atual

    document.getElementById('city-name').textContent = cityName;
    document.getElementById('current-date').textContent = currentDate;
    document.getElementById('temp-current').textContent = data.main.temp.toFixed(1); // Temperatura atual
    document.getElementById('temp-max').textContent = data.main.temp_max.toFixed(1); // Temperatura máxima
    document.getElementById('temp-min').textContent = data.main.temp_min.toFixed(1); // Temperatura mínima
    document.getElementById('rain-prob').textContent = data.rain ? data.rain['1h'] : 0; // Probabilidade de chuva (1 hora)

    // Adicionar uma descrição do clima em português
    const weatherDescription = weatherTranslation[data.weather[0].description] || data.weather[0].description;
    document.getElementById('weather-description').textContent = weatherDescription;

    // Exibir ícone do clima
    const iconId = data.weather[0].icon;
    document.getElementById('weather-icon').src = `http://openweathermap.org/img/wn/${iconId}.png`;

    // Calcular e exibir a fase da lua
    const moonPhase = getMoonPhase(new Date());
    document.getElementById('moon-phase').textContent = moonPhase;
}

// Função para exibir a previsão do tempo para os próximos dias
function displayForecastData(data) {
    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = ''; // Limpa o conteúdo anterior

    const today = new Date();
    const daysToDisplay = [1, 2, 3, 4]; // Dias seguintes

    // Filtra e exibe a previsão para os próximos dias
    daysToDisplay.forEach(dayOffset => {
        const forecastDay = new Date(today);
        forecastDay.setDate(today.getDate() + dayOffset);
        
        const forecastData = data.list.filter(item => {
            const forecastDate = new Date(item.dt * 1000);
            return forecastDate.getDate() === forecastDay.getDate() && forecastDate.getMonth() === forecastDay.getMonth();
        })[0];

        if (forecastData) {
            const date = forecastDay.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const temp = forecastData.main.temp.toFixed(1);
            const iconId = forecastData.weather[0].icon;
            const description = weatherTranslation[forecastData.weather[0].description] || forecastData.weather[0].description;

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <h4>${date}</h4>
                <img src="http://openweathermap.org/img/wn/${iconId}.png" alt="${description}">
                <p>${temp} °C</p>
                <p>${description}</p>
            `;
            forecastContainer.appendChild(forecastItem);
        }
    });
}

// Função para mostrar/ocultar indicador de carregamento
function showLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Evento do botão de consulta
document.getElementById('search-btn').addEventListener('click', () => {
  handleSearch();
});

// Evento de pressionar a tecla Enter no campo de entrada
document.getElementById('city-input').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
      handleSearch();
  }
});

// Função para realizar a busca
function handleSearch() {
  const city = document.getElementById('city-input').value.trim();
  if (city) {
      fetchCityCoordinates(city);
      fetchWeatherData(city);
      document.getElementById('city-input').value = ''; // Limpa o campo após a busca
  } else {
      alert('Por favor, insira o nome de uma cidade.');
  }
}

