// admin/modifier_article.js (version corrigée)
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-modif-article");
    const articleIdInput = document.getElementById("articleId");
    const titreInput = document.getElementById("titre");
    const resumeInput = document.getElementById("resume");
    const descriptionInput = document.getElementById("description");
    const sourceInput = document.getElementById("source"); // Ajout du champ source
    const imageInput = document.getElementById("image");
    const previewImage = document.getElementById("preview-image");
    const currentImageInput = document.getElementById("currentImage");
    const removeImageCheckbox = document.getElementById("remove-image"); // Optionnel: case à cocher pour supprimer l'image

    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const idToEdit = parseInt(urlParams.get('id'));

    async function loadArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`, {
                credentials: 'include' // Pour les routes protégées
            }); 
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erreur serveur' }));
                throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
            }
            
            const article = await response.json();
            articleIdInput.value = article.id;
            titreInput.value = article.title;
            resumeInput.value = article.summary || "";
            descriptionInput.value = article.content;
            sourceInput.value = article.source || ""; // Chargement de la source

            if (article.image_url) {
                previewImage.src = article.image_url;
                previewImage.style.display = "block";
                currentImageInput.value = article.image_url;
            } else {
                previewImage.style.display = "none";
                currentImageInput.value = "";
            }
        } catch (error) {
            console.error("Erreur lors du chargement:", error);
            alert(`Erreur: ${error.message}`);
            window.location.href = "admin.html";
        }
    }

    if (imageInput && previewImage) {
        imageInput.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewImage.style.display = "block";
                }
                reader.readAsDataURL(file);
            } else if (currentImageInput.value) {
                // Si pas de nouveau fichier mais image existante, on la réaffiche
                previewImage.src = currentImageInput.value;
                previewImage.style.display = "block";
            } else {
                previewImage.src = "#";
                previewImage.style.display = "none";
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', titreInput.value);
        formData.append('content', descriptionInput.value);
        formData.append('summary', resumeInput.value);
        formData.append('source', sourceInput.value); // Ajout de la source
        formData.append('currentImage', currentImageInput.value);

        // Gestion de l'image
        const imageFile = imageInput.files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        // Option pour supprimer l'image existante
        if (removeImageCheckbox && removeImageCheckbox.checked) {
            formData.append('remove_image', 'true');
        }
        
        try {
            const response = await fetch(`/api/articles/${idToEdit}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                console.error("Erreur détaillée:", result);
                throw new Error(result.error || `Erreur ${response.status}`);
            }
            
            alert("Article mis à jour avec succès !");
            window.location.href = "admin.html";
        } catch (error) {
            console.error("Erreur lors de la modification:", error);
            alert(`Erreur: ${error.message}`);
        }
    });

    if (idToEdit && !isNaN(idToEdit)) {
        loadArticle(idToEdit);
    } else {
        alert("ID d'article invalide");
        window.location.href = "admin.html";
    }
});