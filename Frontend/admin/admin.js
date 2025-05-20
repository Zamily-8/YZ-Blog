// admin/admin.js
document.addEventListener("DOMContentLoaded", () => {
    // Sélection des éléments du DOM
    const tbody = document.querySelector("#tableau-articles tbody");
    const noArticlesAdminMessage = document.getElementById("no-articles-admin");

    // Mettre à jour l'année dans le footer
    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Fonction pour tronquer le texte si trop long
    const truncateText = (text, maxLength = 50) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    /* 
     * Nouveau: Chargement des articles depuis l'API
     * Remplace l'ancien localStorage
     */
    async function loadArticles() {
        try {
            // Requête GET vers l'API
            const response = await fetch('/api/articles', {
                credentials: 'include' // Pour l'authentification
            });
            
            if (!response.ok) throw new Error('Erreur de chargement');
            
            const articles = await response.json();
            renderArticles(articles);
        } catch (error) {
            console.error("Erreur:", error);
            noArticlesAdminMessage.style.display = "block";
        }
    }

    // Fonction pour afficher les articles dans le tableau
    function renderArticles(articles) {
        tbody.innerHTML = "";
    
        if (!articles || articles.length === 0) {
            noArticlesAdminMessage.style.display = "block";
            return;
        }
        
        noArticlesAdminMessage.style.display = "none";
    
        articles.forEach(article => {
            const tr = document.createElement("tr");
            tr.setAttribute('data-id', article.id);
            
            tr.innerHTML = `
                <td>${article.title || 'N/A'}</td>
                <td>${truncateText(article.summary)}</td>
                <td>${truncateText(article.source, 30)}</td> <!-- Afficher la source -->
                <td class="actions">
                    <button class="btn btn-primary btn-sm edit-btn" data-id="${article.id}">
                        <img src="../images/icons/edit-icon.png" class="icon-local"> Modifier
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${article.id}">
                        <img src="../images/icons/delete-icon.png" class="icon-local"> Supprimer
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    
        attachEventListeners();
    }

    // Fonction pour attacher les écouteurs d'événements (inchangée)
    function attachEventListeners() {
        document.querySelectorAll(".edit-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const articleId = e.currentTarget.dataset.id;
                window.location.href = `modifier_article.html?id=${articleId}`;
            });
        });

        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const articleId = parseInt(e.currentTarget.dataset.id);
                if (confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
                    deleteArticle(articleId);
                }
            });
        });
    }

    /* 
     * Nouvelle version avec suppression via API
     * Remplace l'ancienne version localStorage
     */
    async function deleteArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Échec de suppression');
            
            loadArticles(); // Recharge la liste mise à jour
            alert("Article supprimé avec succès !");
        } catch (error) {
            console.error("Erreur:", error);
            alert("Échec de la suppression");
        }
    }

    // Chargement initial
    loadArticles();
});