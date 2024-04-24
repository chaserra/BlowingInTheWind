// Import config.js
import config from "./config.js";

async function fetchWeatherData(lat, lon){

    try{
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=`+config.WEATHER_API_KEY);

        if(!response.ok){
            throw new Error("Could not fetch resource");
        }
        //converts to json file 
        const weatherData = await response.json();
        // Access wind data
        const windSpeed = weatherData.wind.speed; // Wind speed in meters per second
        const windDirection = weatherData.wind.deg; 
        //returns wind data as an object 
        return { windSpeed, windDirection }; 

   
    }
    catch(error){
        console.error(error);
        return null;
    }

}
//exports it to bitw_script.js
export {fetchWeatherData};