// import axios from "axios";
// import express from "express";
// import Movie from "../models/Movie.js";
// import Show from "../models/Show.js";
// import "dotenv/config";

// // api to get now playing movies from TMDB api
// export const getNowPlayingMovies = async (req, res) => {
//   try {
//     const { data } = await axios.get(
//       "https://api.themoviedb.org/3/movie/now_playing",
//       {
//         headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
//       },
//     );
//     const movies = data.results;
//     res.json({ success: true, movies: movies });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// // api to new show add to the data base
// export const addShow = async (req, res) => {
//   try {
//     const { movieId, showsInput, showPrice } = req.body;

//     let movie = await Movie.findById(movieId);

//     if (!movie) {
//       // fetch movie datails and credits from tmdb api
//       const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
//         axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
//           headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
//         }),

//         axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
//           headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
//         }),
//       ]);

//       const movieApiData = movieDetailsResponse.data;
//       const movieCreditsData = movieCreditsResponse.data;

//       const movieDetails = {
//         _id: movieId,
//         title: movieApiData.title,
//         overview: movieApiData.overview,
//         poster_path: movieApiData.poster_path,
//         backdrop_path: movieApiData.backdrop_path,
//         genres: movieApiData.genres,
//         casts: movieCreditsData.cast,
//         release_date: movieApiData.release_date,
//         original_language: movieApiData.original_language,
//         tagline: movieApiData.tagline || "",
//         vote_average: movieApiData.vote_average,
//         runtime: movieApiData.runtime,
//       };

//       // add movie to the database
//       movie = await Movie.create(movieDetails);
//     }

//     const showsToCreate = [];
//     showsInput.forEach((show) => {
//       const showDate = show.date;
//       show.time.forEach((time) => {
//         const dateTimeString = `${showDate}T${time}`;
//         showsToCreate.push({
//           movie: movieId,
//           showDateTime: new Date(dateTimeString),
//           showPrice: showPrice,
//           occupiedSeats: {},
//         });
//       });
//     });

//     if (showsToCreate.length > 0) {
//       await Show.insertMany(showsToCreate);
//     }

//     res.json({ success: true, message: "Show Added Successfully." });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// // api to get all shows from the database
// export const getShows = async (req, res) => {
//   try {
//     const shows = await Show.find({ showDateTime: { $gte: new Date() } })
//       .populate("movie")
//       .sort({ showDateTime: 1 });

//     // filter unique shows
//     const uniqueShows = new Set(shows.map((show) => show.movie));
//     res.json({ success: true, shows: Array.from(uniqueShows) });
//   } catch (error) {
//     console.error(error);

//     res.json({ success: false, message: error.message });
//   }
// };

// // api to get a single show from database
// export const getShow = async (req, res) => {
//   try {
//     const { movieId } = req.params;
//     // get all the comming shows for the movie
//     const shows = await Show.find({
//       movie: movieId,
//       showDateTime: { $gte: new Date() },
//     });

//     const movie = await Movie.findById(movieId);
//     const dateTime = {};

//     shows.forEach((show) => {
//       const date = show.showDateTime.toISOString().split("T")[0];
//       if (!dateTime[date]) {
//         dateTime[date] = [];
//       }
//       dateTime[date].push({ time: show.showDateTime, showId: show._id });
//     });
//     res.json({ success: true, movie, dateTime });
//   } catch (error) {
//     console.error(error);

//     res.json({ success: false, message: error.message });
//   }
// };



//new  

import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import "dotenv/config";

// Create axios instance with timeout
const axiosInstance = axios.create({
  timeout: 5000, // 5 seconds
});

//  Retry function
const fetchWithRetry = async (url, options, retries = 3) => {
  try {
    return await axiosInstance.get(url, options);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... (${retries})`);
      await new Promise((res) => setTimeout(res, 500)); // small delay
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

// ==============================
// 🎬 GET NOW PLAYING MOVIES
// ==============================
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await fetchWithRetry(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("NOW PLAYING ERROR:", error.message);
    res.json({ success: false, message: "Failed to fetch movies" });
  }
};


// ADD SHOW

export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    //  Check if movie already exists (avoid API call)
    let movie = await Movie.findById(movieId);

    if (!movie) {
      console.log("Fetching movie from TMDB...");

      //  Fetch movie details + credits with retry
      const [movieDetailsResponse, movieCreditsResponse] =
        await Promise.all([
          fetchWithRetry(
            `https://api.themoviedb.org/3/movie/${movieId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
              },
            }
          ),
          fetchWithRetry(
            `https://api.themoviedb.org/3/movie/${movieId}/credits`,
            {
              headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
              },
            }
          ),
        ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      //  Prepare movie object
      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      movie = await Movie.create(movieDetails);
    } else {
      console.log("Movie already exists in DB ✅");
    }

    
    // FIXED SHOWS INPUT LOOP
    
    const showsToCreate = [];

    showsInput.forEach((show) => {
      const showDate = show.date;

      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;

        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice: showPrice,
          occupiedSeats: {},
        });
      });
    });

    // Insert shows
    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: "Show Added Successfully." });
  } catch (error) {
    console.error("ADD SHOW ERROR:", error.response?.data || error.message);

    res.json({
      success: false,
      message: "Failed to add show. Try again.",
    });
  }
};


//  GET ALL SHOWS

export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const uniqueShows = new Set(shows.map((show) => show.movie));

    res.json({
      success: true,
      shows: Array.from(uniqueShows),
    });
  } catch (error) {
    console.error("GET SHOWS ERROR:", error.message);
    res.json({ success: false, message: "Failed to fetch shows" });
  }
};


// GET SINGLE SHOW

export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];

      if (!dateTime[date]) {
        dateTime[date] = [];
      }

      dateTime[date].push({
        time: show.showDateTime,
        showId: show._id,
      });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error("GET SHOW ERROR:", error.message);
    res.json({ success: false, message: "Failed to fetch show" });
  }
};



// api for trailer section

//  GET MOVIE TRAILER

export const getMovieTrailer = async (req, res) => {
  try {
    const { movieId } = req.params;

    const { data } = await fetchWithRetry(
      `https://api.themoviedb.org/3/movie/${movieId}/videos`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    // Find YouTube Trailer
    const trailer = data.results.find(
      (vid) => vid.type === "Trailer" && vid.site === "YouTube"
    );

    if (!trailer) {
      return res.json({
        success: false,
        message: "Trailer not available",
      });
    }

    res.json({
      success: true,
      key: trailer.key,
    });
  } catch (error) {
    console.error("TRAILER ERROR:", error.message);
    res.json({ success: false, message: "Failed to fetch trailer" });
  }
};
