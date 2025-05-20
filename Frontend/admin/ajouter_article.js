// admin/ajouter_article.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-ajout-article");
    const imageInput = document.getElementById("image");
    const previewImage = document.getElementById("preview-image");

    const currentYearSpan = document.getElementById("currentYear");
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
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
            } else {
                previewImage.src = "#";
                previewImage.style.display = "none";
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', document.getElementById('titre').value);
        formData.append('content', document.getElementById('description').value); // 'description' est l'ID dans le HTML
        formData.append('summary', document.getElementById('resume').value);
        formData.append('source', document.getElementById('source').value); // Le backend ne gère pas 'source' pour l'instant
        
        const imageFile = document.getElementById('image').files[0];
        if (imageFile) {
            formData.append('image', imageFile); // 'image' doit correspondre au nom attendu par multer.single('image')
        }
    
        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                body: formData, // Pas besoin de Content-Type, le navigateur le met pour FormData
                credentials: 'include' // Important pour envoyer les cookies d'authentification
            });
    
            const result = await response.json();
            
            if (!response.ok) {
                console.error("Erreur détaillée:", result);
                throw new Error(result.error || `Échec de l'ajout: ${response.statusText}`);
            }
    
            alert("Article ajouté avec succès !");
            window.location.href = "admin.html";
        } catch (error) {
            console.error("Erreur complète:", error);
            alert(`Erreur: ${error.message}`);
        }
    });
});