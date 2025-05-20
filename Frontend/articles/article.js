// articles/article.js (nouvelle version corrigée)
document.addEventListener("DOMContentLoaded", () => {
    const articleContentWrapper = document.getElementById("article-content-wrapper");
    const commentForm = document.getElementById("comment-form");
    const commentsListContainer = document.getElementById("comments-list-container");
    const noCommentsMessage = commentsListContainer.querySelector(".no-comments");
    const loadingPlaceholder = document.querySelector(".loading-placeholder");

    // Mettre à jour l'année dans le footer
    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const articleId = parseInt(urlParams.get('id'));

    // Fonction pour formater la date
    function formatDate(isoString) {
        if (!isoString) return 'Date inconnue';
        const date = new Date(isoString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    /* Charge un article depuis l'API */
    async function loadArticle() {
        if (!articleId) {
            showError("ID d'article manquant ou invalide.");
            return;
        }

        try {
            // Chargement de l'article
            const articleResponse = await fetch(`/api/articles/${articleId}`);
            if (!articleResponse.ok) throw new Error('Article non trouvé');
            const article = await articleResponse.json();

            // Chargement des commentaires
            const commentsResponse = await fetch(`/api/articles/${articleId}/comments`);
            const comments = commentsResponse.ok ? await commentsResponse.json() : [];

            renderArticle(article, comments);
        } catch (error) {
            console.error("Erreur:", error);
            showError("Impossible de charger l'article");
        }
    }

    /* Affiche l'article et ses commentaires */
    function renderArticle(article, comments) {
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';

        // Met à jour le titre de la page
        document.title = `${article.title} - YZ-Blog`;

        // Construction du HTML de l'article
        let imageHtml = '';
        if (article.image_url) {
            imageHtml = `
                <div class="article-image-container">
                    <img src="${article.image_url}" alt="${article.title}">
                </div>`;
        }

        articleContentWrapper.innerHTML = `
            <div class="article-header">
                <h1>${article.title}</h1>
                <div class="article-meta">
                    <span><i class="fas fa-calendar-alt"></i> Publié le: ${formatDate(article.created_at)}</span>
                    ${article.category ? `<span><i class="fas fa-tag"></i> Catégorie: ${article.category}</span>` : ''}
                </div>
            </div>
            ${imageHtml}
            <div class="article-content">
                ${article.content.replace(/\n/g, '<br>')}
            </div>
            ${article.source ? `
                <div class="article-source-container">
                    <strong>Source :</strong> 
                    ${isValidUrl(article.source) ? 
                        `<a href="${formatUrl(article.source)}" target="_blank" rel="noopener noreferrer">${article.source}</a>` : 
                        `<span>${article.source}</span>`}
                </div>` : ''}
        `;

        // Affiche les commentaires
        renderComments(comments);
    }

    /* Vérifie si une chaîne est une URL valide */
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /* Formate une URL pour avoir le protocole http si manquant */
    function formatUrl(url) {
        if (!url) return '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `http://${url}`;
        }
        return url;
    }

    /* Affiche la liste des commentaires */
    function renderComments(comments) {
        commentsListContainer.querySelectorAll('.comment-item').forEach(item => item.remove());

        if (comments.length > 0) {
            if (noCommentsMessage) noCommentsMessage.style.display = "none";
            
            comments.forEach(comment => {
                const commentElement = document.createElement("div");
                commentElement.classList.add("comment-item");
                commentElement.innerHTML = `
                    <p class="comment-author">
                        ${comment.author_name || 'Anonyme'}
                        <span class="comment-date">- ${formatDate(comment.created_at)}</span>
                    </p>
                    <p class="comment-body">${escapeHTML(comment.content)}</p>
                `;
                commentsListContainer.appendChild(commentElement);
            });
        } else {
            if (noCommentsMessage) noCommentsMessage.style.display = "block";
        }
    }

    /* Échappe le HTML pour la sécurité */
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* Affiche un message d'erreur */
    function showError(message = "Article non trouvé") {
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        articleContentWrapper.innerHTML = `<p>${message}</p>`;
    }

    /* Gestion de la soumission des commentaires */
    if (commentForm) {
        commentForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            const emailInput = document.getElementById("comment-email");
            const commentTextInput = document.getElementById("comment-text");

            const email = emailInput.value.trim();
            const content = commentTextInput.value.trim();

            // Validation
            if (!/^\S+@\S+\.\S+$/.test(email)) {
                alert("Veuillez entrer une adresse email valide.");
                emailInput.focus();
                return;
            }

            if (!content) {
                alert("Veuillez écrire votre commentaire.");
                commentTextInput.focus();
                return;
            }

            try {
                // Envoi du commentaire à l'API
                const response = await fetch(`/api/articles/${articleId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        content: content,
                        author_name: "Anonyme"
                    })
                });

                if (!response.ok) throw new Error('Échec de la soumission');

                // Recharge les commentaires après ajout
                const commentsResponse = await fetch(`/api/articles/${articleId}/comments`);
                const comments = await commentsResponse.json();
                renderComments(comments);

                commentForm.reset();
                alert("Commentaire soumis avec succès !");
            } catch (error) {
                console.error("Erreur:", error);
                alert("Échec de l'envoi du commentaire");
            }
        });
    }

    // Chargement initial
    loadArticle();
});