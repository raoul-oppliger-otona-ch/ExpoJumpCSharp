using System;
using System.Configuration;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace ConsoleApp1.code
{
    class manipFileFolder
    {

        /// <summary>
        /// extrait les lignes lors de la lecture d'un fichier d'un fichier
        /// </summary>
        /// <param String="sourceFile">Le nom du fichier traiter</param>
        /// <returns>Un tableau avec les lignes du fichier</returns> 
        public string[] extractLines(String sourceFile)
        {
            string[] lines = File.ReadAllLines(sourceFile);
            return lines;
        }

        /// <summary>
        /// Construit une chaine de caractères (StringBuilder) avec le contenu d'un fichier
        /// </summary>
        /// <param String="sourceFile">Le nom du fichier traiter</param>
        /// <returns>Une chaine de caractères</returns> 
        public StringBuilder recopiage(String sourceFile)
        {
            StringBuilder monContenu = new StringBuilder();
            using (StreamReader sr = new StreamReader(sourceFile))
            {
                // Read the stream to a string, and write the string to the console.
                String line = sr.ReadToEnd();
                monContenu.Append(line);
            }
            return monContenu;
        }


        /// <summary>
        /// Certains parties du contenu sont dynamiques et doivent être remplacées
        /// 
        /// </summary>
        /// <param name="contenu">contenu initial</param>
        /// <returns>Le contenu traité</returns>
        public StringBuilder traitementFile(StringBuilder contenu)
        {
            try
            {
                //String leLogo = ConfigurationSettings.AppSettings["siteLogo"];
                //String leTitre = ConfigurationSettings.AppSettings["siteTitle"];
                //String version = ConfigurationSettings.AppSettings["version_number"];
                String sourceFile;
                StringBuilder modif;
                if (contenu.ToString().Contains("<p>blocHead</p>"))
                {
                    modif = recopiage(Globals.pathServer + "/_includes/blocHead.html");
                    contenu.Replace("<p>blocHead</p>", modif.ToString());
                }
                if (contenu.ToString().Contains("<p>blocHeader</p>"))
                {
                    modif = recopiage(Globals.pathServer + "/_includes/blocHeader.html");
                    contenu.Replace("<p>blocHeader</p>", modif.ToString());
                }
                if (contenu.ToString().Contains("<p>blocFooter</p>"))
                {
                    modif = recopiage(Globals.pathServer + "/_includes/blocFooter.html");
                    contenu.Replace("<p>blocFooter</p>", modif.ToString());
                }
                if (contenu.ToString().Contains("<p>blocAccueil</p>"))
                {
                    modif = recopiage(Globals.pathServer + "/_includes/blocAccueil.html");
                    contenu.Replace("<p>blocAccueil</p>", modif.ToString());
                }
                while (contenu.ToString().Contains("<p>site.baseurl</p>"))
                {
                    contenu.Replace("<p>site.baseurl</p>", "");
                }
                while (contenu.ToString().Contains("<p>titre</p>"))
                {
                    contenu.Replace("<p>titre</p>", "Une visite E-guidée");
                }
                /*
                while (contenu.ToString().Contains("{{site.logo}}"))
                {
                    contenu.Replace("{{site.logo}}", leLogo);

                }
                while (contenu.ToString().Contains("{{site.title}}"))
                {
                    contenu.Replace("{{site.title}}", leTitre);

                }
                while (contenu.ToString().Contains("{{site.version_number}}"))
                {
                    contenu.Replace("{{site.version_number}}", version);

                }
                */


                return contenu;
            }
            catch (Exception err)
            {
                contenu.Append(err.Message.ToString());
                return contenu;
            }
        }


        /// <summary>
        /// Extrait le nom d'un fichier ou d'un dossier
        /// </summary>
        /// <param name="path">Le chemin du fichier ou du dossier </param>
        /// <returns>Le nom du fichier ou du dossier </returns>
        public string extractName(string path)
        {
            string fileFolderName = path.Split('\\')[path.Split('\\').Length - 1];
            return fileFolderName;
        }



        /// <summary>
        /// Gère le traitement des images dans la construction d'un poster
        /// </summary>
        /// <param name="posterIdentifiant">L'identifiant du poster (nom) </param>
        /// <returns>Le nom du fichier ou du dossier </returns>
        public String traitementImages(String posterIdentifiant, String cible)
        {
            // ********************  TRAITEMENT  DES  IMAGES
            // Il faut aller chercher les photos dans le répertoire adéquat
            // (posters/posterIdentifiant/_assets/*.jpg)
            // et les recopier dans le répertoire adéquat de la visite
            String imageName = "";
            String LesImages = "";
            var ImageFiles = Directory.GetFiles(Globals.pathServer + "/posters/" + posterIdentifiant + "/_assets");
            foreach (var f in ImageFiles)
            {

                if (f.EndsWith("jpg") || f.EndsWith("png"))
                {
                    imageName = extractName(f);
                    LesImages = LesImages + recopiage(Globals.pathServer + "/_includes/blocPosterPhoto.html");

                    // Il faut maintenant effacer - copier l'image sur le client si elle n'existe pas déjà
                    File.Copy(Path.Combine(Globals.pathServer + "/posters/" + posterIdentifiant + "/_assets", imageName), Path.Combine(Globals.pathClient + "/visite/assets/", imageName), true);
                    // et remplacer lienPhoto par le chemin qui sera sur le client

                    while (LesImages.ToString().Contains("<p>lienPhoto</p>"))
                    {
                        LesImages = LesImages.Replace("<p>lienPhoto</p>", "/visite/assets/" + imageName);
                    }

                }
            }

            return LesImages;
        }

        /// <summary>
        /// Gère le traitement des videos dans la construction d'un poster
        /// </summary>
        /// <param name="posterIdentifiant">L'identifiant du poster (nom) </param>
        /// <returns>Le nom du fichier ou du dossier </returns>
        public String traitementVideos(String posterIdentifiant, String cible)
        {
            String videoName = "";
            String LesImages = "";
            // ********************  TRAITEMENT  DES  Videos
            // Il faut aller chercher les videos dans le répertoire adéquat
            // (posters/posterIdentifiant/_assets/*.mp3)
            // et les recopier dans le répertoire adéquat de la visite

            var videoFiles = Directory.GetFiles(Globals.pathServer + "/posters/" + posterIdentifiant + "/_assets");
            LesImages = "";
            foreach (var f in videoFiles)
            {

                if (f.EndsWith("mp3"))
                {
                    videoName = extractName(f);
                    LesImages = LesImages + recopiage(Globals.pathServer + "/_includes/blocPosterVideo.html");

                    // Il faut maintenant effacer - copier l'image sur le client si elle n'existe pas déjà
                    File.Copy(Path.Combine(Globals.pathServer + "/posters/" + posterIdentifiant + "/_assets", videoName), Path.Combine(Globals.pathClient + "/visite/assets/", videoName), true);
                    // et remplacer lienPhoto par le chemin qui sera sur le client

                    while (LesImages.ToString().Contains("<p>videoSource</p>"))
                    {
                        LesImages = LesImages.Replace("<p>videoSource</p>", "/visite/assets/" + videoName);
                    }

                }
            }

            return LesImages;
        }

        /// <summary>
        /// Gère le traitement des videos dans la construction d'un poster
        /// </summary>
        /// <param name="posterIdentifiant">L'identifiant du poster (nom) </param>
        /// <returns>Le nom du fichier ou du dossier </returns>
        public String traitementTextes(String posterIdentifiant)
        {
            String fileName = "";
            String LesTextes = "";
            String templateName = "";
            // Il faut aller chercher le dans le répertoire adéquat
            // (posters/posterIdentifiant/*.txt)
            var TexteFiles = Directory.GetFiles(Globals.pathServer + "/posters/" + posterIdentifiant);
            foreach (var f in TexteFiles)
            {

                if (f.EndsWith("txt"))
                {
                    fileName = extractName(f);

                    // Connaissant le nom, on regarde si la première lignes du fichier comprend un layout
                    // Si oui, on fait le traitement
                    // Si non, on applique le replace classique
                    string[] lines = File.ReadAllLines(f);
                    // on contr0le qu'il y ait layout dans la première ligne
                    if (lines.Count() > 0)
                    {
                        String[] myLayouts = Regex.Split(lines[0], "===");
                        String myLayout = myLayouts[0];
                        if (myLayout.Contains("Layout"))
                        {
                            // On est dans le cadre d'une zone construite avec une template de type zone
                            // On controle le nom du template
                            templateName = myLayouts[1].Replace("\t", "");
                            switch (templateName)
                            {
                                case "zoneListe":
                                    LesTextes = LesTextes + constructZoneListe(f);
                                    break;
                                default:
                                    LesTextes = LesTextes + constructZone(f);
                                    break;
                            }
                        }
                        else
                        {
                            LesTextes = LesTextes + recopiage(Globals.pathServer + "/_includes/blocPosterTexte.html");
                        }
                    }
                    else
                    {
                        LesTextes = LesTextes + recopiage(Globals.pathServer + "/_includes/blocPosterTexte.html");

                    }
                    // lines[0].Split(':')[1]  "zoneIdentite"   


                    // Il faut maintenant remplacer textPoster par le texte contenu dans le fichier

                    while (LesTextes.ToString().Contains("<p>textPoster</p>"))
                    {
                        LesTextes = LesTextes.Replace("<p>textPoster</p>", "<blockquote>" + recopiage(f).ToString() + "</blockquote>");
                    }

                }

            }
            return LesTextes;
        }

        /// <summary>
        /// Gère le traitement des textes (avec zones de liste) dans la construction d'un poster
        /// </summary>
        /// <param name="filePathName">le nom du fichier contenant les données à traiter </param>
        /// <returns>Le contenu </returns>
        public String constructZoneListe(String filePathName)
        {
            String contenu = "";
            int compteur = 0;
            String colonneName = "";
            String colonneValeur = "";
            string[] lines = File.ReadAllLines(filePathName);
            String[] myLayoutFiles = Regex.Split(lines[0], "===");
            String myLayoutFile = myLayoutFiles[1].Replace("\t", "") + ".html";
            // On a le nom du fichier qui contient le layout et on sait qu'il se trouve dans les includes
            // On a le contenu du fichier à écrire
            // Pour chaque ligne du fichier de données, il faut effectuer le remplacement
            for (int i = 1; i < lines.Count(); i++)
            {
                // Est-ce que la ligne a une longueur non nulle
                int maLigne = lines[i].Replace(" ", "").Count();
                if (maLigne != 0)
                {
                    compteur = compteur + 1;
                    contenu = contenu + recopiage(Globals.pathServer + "/_includes/" + myLayoutFile);
                    contenu = contenu.Replace("$$i$$", compteur.ToString());
                    contenu = contenu.Replace("$$Ligne$$", lines[i]);
                }
            }
            return contenu;
        }

        /// <summary>
        /// Gère le traitement des textes (avec template) dans la construction d'un poster
        /// </summary>
        /// <param name="filePathName">le nom du fichier contenant les données à traiter </param>
        /// <returns>Le contenu </returns>
        public String constructZone(String filePathName)
        {
            String contenu = "";
            String colonneName = "";
            String colonneValeur = "";
            string[] lines = File.ReadAllLines(filePathName);
            String[] myLayoutFiles = Regex.Split(lines[0], "===");
            String myLayoutFile = myLayoutFiles[1].Replace("\t", "") + ".html";
            // On a le nom du fichier qui contient le layout et on sait qu'il se trouve dans les includes
            contenu = contenu + recopiage(Globals.pathServer + "/_includes/" + myLayoutFile);
            // On a le contenu du fichier à écrire
            // Pour chaque ligne du fichier de données, il faut effectuer le remplacement
            for (int i = 1; i < lines.Count(); i++)
            {
                // Est ce que la ligne contient un séparateur
                if (lines[i].Contains("==="))
                {
                    String[] myLayouts = Regex.Split(lines[i], "===");
                    colonneName = myLayouts[0].Replace("\t", "").Replace(" ", "");
                    colonneValeur = myLayouts[1].Replace("\t", "");
                    // On remplace le nom par la valeur
                    contenu = contenu.Replace("$$" + colonneName + "$$", colonneValeur);
                    i = i;
                }
            }
            return contenu;
        }

        /// <summary>
        /// Gère le traitement des vignettes supérieures dans la construction d'un poster
        /// </summary>
        /// <param name="posterIdentifiant">L'identifiant du poster (nom) </param>
        /// <returns>Le nom du fichier ou du dossier </returns>
        public String traitementVignettes(String idVignette, String href, String backImagePath)
        {
            String vignettes = "";
            String backImage = "";
            var ImageFiles = Directory.GetFiles(Globals.pathServer + "/posters/" + idVignette + "/_assets");
            foreach (var f in ImageFiles)
            {
                if (f.EndsWith("jpg") || f.EndsWith("png"))
                {
                    backImage = "/visite/assets/" + extractName(f);
                }
            }

            vignettes = vignettes + recopiage(Globals.pathServer + "/_includes/blocVignettesSuperieures.html");
            vignettes = vignettes.Replace("<p>hrefNext</p>", href);
            vignettes = vignettes.Replace("<p>backImage</p>", backImage);
            return vignettes;
        }
    }

}
