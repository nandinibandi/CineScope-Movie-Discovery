const main = document.getElementById("mainSection");
const searchButton = document.getElementById("searchButton");
const resetButton = document.getElementById("resetButton");
const headerSearchForm = document.getElementById("headerSearchForm");
const modal = document.getElementById("movieModal");
const trailerFrame = document.getElementById("modalTrailer");
const noTrailerMessage = document.getElementById("noTrailerMessage");

const fallbackPoster = "assets/images/imageNotFound.svg";

function buildApiUrl(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function fetchMovies(url) {
  if (!API_KEY || API_KEY === "YOUR_TMDB_API_KEY") {
    main.innerHTML = "";
    showMessage("Add your TMDB API key in js/config.js to load movies.");
    return;
  }

  showMessage("Loading movies...");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
    const data = await response.json();
    renderMovies(data.results || []);
  } catch (error) {
    console.error("Movie loading error:", error);
    showMessage("Unable to load movies. Check your internet connection and TMDB API key, then try again.");
  }
}

function showMessage(message) {
  main.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "status-message";
  paragraph.textContent = message;
  main.appendChild(paragraph);
}

function renderMovies(movies) {
  main.innerHTML = "";
  if (movies.length === 0) {
    showMessage("No movies found. Try a different title or filter.");
    return;
  }

  const row = document.createElement("div");
  row.className = "row";

  movies.forEach((movie) => {
    const column = document.createElement("article");
    column.className = "column";

    const card = document.createElement("div");
    card.className = "card";

    const image = document.createElement("img");
    image.className = "thumbnail";
    image.src = movie.poster_path ? `${TMDB_IMAGE_URL}${movie.poster_path}` : fallbackPoster;
    image.alt = `${movie.title || "Movie"} poster`;
    image.loading = "lazy";
    image.addEventListener("click", () => openMovieDetails(movie));

    const title = document.createElement("h3");
    title.textContent = movie.title || "Untitled movie";

    const meta = document.createElement("div");
    meta.className = "movie-meta";

    const date = document.createElement("span");
    date.textContent = formatDate(movie.release_date);

    const rating = document.createElement("span");
    rating.textContent = `⭐ ${Number(movie.vote_average || 0).toFixed(1)}`;

    meta.append(date, rating);
    card.append(image, title, meta);
    column.appendChild(card);
    row.appendChild(column);
  });

  main.appendChild(row);
}

function formatDate(dateString) {
  if (!dateString) return "Release date unavailable";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Release date unavailable";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function openMovieDetails(movie) {
  document.getElementById("modalImage").src = movie.poster_path
    ? `${TMDB_IMAGE_URL}${movie.poster_path}`
    : fallbackPoster;
  document.getElementById("modalTitle").textContent = movie.title || "Movie details";
  document.getElementById("modalOverview").textContent = movie.overview || "No overview available.";
  document.getElementById("modalRating").textContent = `⭐ Rating: ${Number(movie.vote_average || 0).toFixed(1)}`;
  document.getElementById("modalReleaseDate").textContent = `📅 Released: ${formatDate(movie.release_date)}`;

  trailerFrame.src = "";
  trailerFrame.hidden = true;
  noTrailerMessage.hidden = true;
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";

  if (!API_KEY || API_KEY === "YOUR_TMDB_API_KEY") {
    noTrailerMessage.textContent = "Add your TMDB API key to load trailers.";
    noTrailerMessage.hidden = false;
    return;
  }

  try {
    const response = await fetch(buildApiUrl(`/movie/${movie.id}/videos`));
    if (!response.ok) throw new Error("Could not load movie videos.");
    const videoData = await response.json();
    const trailer = (videoData.results || []).find(
      (video) => video.site === "YouTube" && video.type === "Trailer"
    );

    if (trailer) {
      trailerFrame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}`;
      trailerFrame.hidden = false;
    } else {
      noTrailerMessage.textContent = "No trailer available for this movie.";
      noTrailerMessage.hidden = false;
    }
  } catch (error) {
    console.error("Trailer loading error:", error);
    noTrailerMessage.textContent = "The trailer could not be loaded.";
    noTrailerMessage.hidden = false;
  }
}

function searchMovies() {
  const query = (
    document.getElementById("advancedSearchbox").value ||
    document.getElementById("searchbox").value
  ).trim();

  const genre = document.getElementById("genreFilter").value;
  const year = document.getElementById("yearFilter").value;
  const language = document.getElementById("languageFilter").value;
  const rating = document.getElementById("ratingFilter").value;
  const order = document.getElementById("orderFilter").value;

  // A title search uses TMDB's search endpoint. Other filters use discover.
  if (query) {
    fetchMovies(buildApiUrl("/search/movie", { query, year }));
    return;
  }

  fetchMovies(buildApiUrl("/discover/movie", {
    sort_by: order || "popularity.desc",
    primary_release_year: year,
    with_original_language: language,
    "vote_average.gte": rating,
    with_genres: genre
  }));
}

searchButton.addEventListener("click", searchMovies);

headerSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchMovies();
});

["searchbox", "advancedSearchbox"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchMovies();
    }
  });
});

resetButton.addEventListener("click", () => {
  document.getElementById("searchbox").value = "";
  document.getElementById("advancedSearchbox").value = "";
  document.getElementById("qualityFilter").value = "";
  document.getElementById("genreFilter").value = "";
  document.getElementById("ratingFilter").value = "";
  document.getElementById("yearFilter").value = "";
  document.getElementById("languageFilter").value = "";
  document.getElementById("orderFilter").value = "popularity.desc";
  fetchMovies(buildApiUrl("/discover/movie", { sort_by: "popularity.desc" }));
});

function closeModal() {
  modal.classList.remove("is-open");
  trailerFrame.src = "";
  document.body.style.overflow = "";
}

document.getElementById("closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
});

// Initial page load
fetchMovies(buildApiUrl("/discover/movie", { sort_by: "popularity.desc" }));
