# mon-espace-mvp
MonEspace est un tableau de bord personnel et modulable qui permet d’organiser son quotidien grâce à des widgets interactifs : Post-it, planning et timer Pomodoro. L’utilisateur peut personnaliser son espace, déplacer ses widgets et retrouver ses informations sauvegardées.

## TinyMCE Cloud

La mise en forme des Post-it utilise TinyMCE Cloud. Crée une clé sur https://www.tiny.cloud/ et ajoute-la à `MonEspace/.env.local` :

```env
VITE_TINYMCE_API_KEY=your_tiny_cloud_api_key
```

Redémarre Vite après avoir ajouté la clé. Le contenu des Post-it est enregistré par l’API MonEspace ; la clé TinyMCE est une configuration client publique et ne doit pas être traitée comme un secret serveur.
