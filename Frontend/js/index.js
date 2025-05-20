// js/index.js
document.addEventListener("DOMContentLoaded", () => {
    const articlesContainer = document.querySelector(".liste-articles");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const noArticlesMessage = document.querySelector(".no-articles");
    let allArticles = []; 

    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    function displayArticles(articlesToDisplay) {
        articlesContainer.innerHTML = ""; 

        if (!articlesToDisplay || articlesToDisplay.length === 0) {
            if (noArticlesMessage) noArticlesMessage.style.display = "block";
            return;
        }
        if (noArticlesMessage) noArticlesMessage.style.display = "none";
        
        articlesToDisplay.forEach(article => {
            const articleElement = document.createElement("article");
            articleElement.classList.add("article-resume");

            const maxResumeLength = 150;
            // Vérifier que article.summary existe et est une chaîne avant d'appeler .length
            const summaryText = (article.summary && typeof article.summary === 'string') 
                                ? (article.summary.length > maxResumeLength ? article.summary.substring(0, maxResumeLength) + "..." : article.summary)
                                : "Pas de résumé disponible.";


            // Utiliser article.image_url qui vient du backend
            const imageUrl = article.image_url || '../images/placeholder.png'; // Un placeholder par défaut

            articleElement.innerHTML = `
                <div class="image-article-wrapper">
                    <img src="${imageUrl}" alt="${article.title || 'Image de l\'article'}">
                </div>
                <div class="contenu-article-resume">
                    <h3>${article.title || 'Titre non disponible'}</h3>
                    <p>${summaryText}</p>
                    <a href="articles/article.html?id=${article.id}" class="lire-suite">Lire la suite <i class="fas fa-arrow-right"></i></a>
                </div>
            `;
            articlesContainer.appendChild(articleElement);
        });
    }

    async function loadArticles() { // Ajout de async
        try {
            const response = await fetch('/api/articles'); // Pas besoin de credentials si la route est publique
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const articles = await response.json();
            allArticles = articles; // Correction: affecter 'articles' à 'allArticles'
            displayArticles(allArticles);
        } catch (error) {
            console.error("Impossible de charger les articles:", error);
            if (noArticlesMessage) {
                noArticlesMessage.textContent = "Impossible de charger les articles pour le moment.";
                noArticlesMessage.style.display = "block";
            }
            articlesContainer.innerHTML = ""; // Vider au cas où
        }
    }

    function filterArticles() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredArticles = allArticles.filter(article =>
            (article.title && article.title.toLowerCase().includes(searchTerm)) ||
            (article.summary && article.summary.toLowerCase().includes(searchTerm))
        );
        displayArticles(filteredArticles);
        if (filteredArticles.length === 0 && noArticlesMessage) {
            noArticlesMessage.textContent = "Aucun article ne correspond à votre recherche.";
            noArticlesMessage.style.display = "block";
        }
    }

    if (searchButton) {
        searchButton.addEventListener("click", filterArticles);
    }
    if (searchInput) {
        searchInput.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                filterArticles();
            }
        });
    }

    loadArticles();
});