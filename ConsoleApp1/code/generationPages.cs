using ConsoleApp1.code;
using System;
using System.Text;
using System.Collections.Specialized;
using System.IO;
using System.Configuration;
using System.Collections.Generic;
using System.Xml;
using System.Xml.Linq;

namespace ConsoleApp1
{
    class Globals
    {
        // global string 
        public static string pathServer;

        // global string 
        public static string pathClient;

    }

    class generationPages
    {
        manipFileFolder mff = new manipFileFolder();

        /// <summary>
        /// Initialisation de la localisation des répertoires client et serveur
        /// </summary>
        /// <param name="pathServer">Localisation du répertoire serveur</param>
        /// <param name="pathClient">Localisation du répertoire client</param>
        public void initialisation(string pathServer, String pathClient)
        {
            Globals.pathClient = pathClient;
            Globals.pathServer = pathServer;
        }


        /// <summary>
        /// Construction la page d'accueil
        /// </summary>
        public void constructAccueil()
        {
            try
            {
                // La page d'accueil se nomme index.html
                // Elle est basée sur le master introduction.html
                // Elle est recopiée dans le répertoire du site avec le même nom
                StringBuilder contenu = new StringBuilder();
                //String visiteFolder = ConfigurationSettings.AppSettings["siteFolder"] + "/visite";


                string masterFile = Globals.pathServer + @"/_masters/introduction.html";
                string destinationFile = Globals.pathClient + "/index.html";

                contenu = mff.recopiage(masterFile);
                contenu = mff.traitementFile(contenu);
                System.IO.File.WriteAllText(destinationFile, contenu.ToString());
            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction de la page d'accueil");
                Console.WriteLine(err.Message);
            }
        }

        /// <summary>
        /// Construction la page d'constructPageQRCode
        /// </summary>
        public void constructPageQRCode()
        {
            try
            {
                // La page d'accueil se nomme index.html
                // Elle est basée sur le master qrCode.html
                // Elle est recopiée dans le répertoire du site avec le même nom
                StringBuilder contenu = new StringBuilder();
                //String visiteFolder = ConfigurationSettings.AppSettings["siteFolder"] + "/visite";


                string masterFile = Globals.pathServer + @"/_masters/qrCode.html";
                string destinationFile = Globals.pathClient + "/qrCode.html";

                contenu = mff.recopiage(masterFile);
                contenu = mff.traitementFile(contenu);
                System.IO.File.WriteAllText(destinationFile, contenu.ToString());
            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction de la page d'accueil");
                Console.WriteLine(err.Message);
            }
        }

        /// <summary>
        /// Cette fonction lit le fichier parcours.xml
        /// Elle construit l'ensemble des parcours et des posters correspondants
        /// </summary>
        public void constructParcours()
        {
            try
            {
                StringBuilder lesParcours = new StringBuilder();

                string masterFileAllParcours = Globals.pathServer + "/_masters/LesParcours.html";
                string destinationFile = Globals.pathClient + "/visite/index.html";

                lesParcours = mff.recopiage(masterFileAllParcours);
                lesParcours = mff.traitementFile(lesParcours);


                // Il faut sélectionner la liste des parcours dans le fichier XML
                // et construire les phrases  parcoursListeLiens  et parcoursListeNoms sur la base des templates
                String fichierXML = Globals.pathServer + "/Parcours.xml";
                String parcoursListeLiens = "";
                String parcoursListeNoms = "";
                XmlDocument listeDesParcours = new XmlDocument();
                listeDesParcours.Load((fichierXML));
                XmlNodeList nodes = listeDesParcours.SelectNodes("exposition/lesParcours/unParcours");
                foreach (XmlNode node in nodes)
                {
                    // On crée un répertoire par parcours
                    Directory.CreateDirectory(Globals.pathClient + "/visite/p" + node.Attributes["id"].Value);

                    // Pour chaque parcours, il faut créer la liste des posters
                    constructPosters(node.Attributes["id"].Value, node.SelectSingleNode("nom").InnerText);

                    // On concatène les liens et les noms
                    parcoursListeLiens = parcoursListeLiens + mff.recopiage(Globals.pathServer + "/_includes/parcoursListeLiens.html");
                    parcoursListeNoms = parcoursListeNoms + mff.recopiage(Globals.pathServer + "/_includes/parcoursListeNoms.html");
                    // On introduit les paramètres de ce parcours
                    parcoursListeLiens = parcoursListeLiens.Replace("<p>hrefParcours</p>", "p" + node.Attributes["id"].Value);
                    parcoursListeNoms = parcoursListeNoms.Replace("<p>hrefParcours</p>", "p" + node.Attributes["id"].Value);
                    parcoursListeLiens = parcoursListeLiens.Replace("<p>numParcours</p>", node.Attributes["id"].Value);
                    parcoursListeNoms = parcoursListeNoms.Replace("<p>numParcours</p>", node.Attributes["id"].Value);
                    parcoursListeLiens = parcoursListeLiens.Replace("<p>nomParcours</p>", node.SelectSingleNode("nom").InnerText);
                    parcoursListeNoms = parcoursListeNoms.Replace("<p>nomParcours</p>", node.SelectSingleNode("nom").InnerText);
                    parcoursListeLiens = parcoursListeLiens.Replace("<p>imageParcours</p>", node.SelectSingleNode("image").InnerText);

                }

                // On met à jour les textes à insérer dans le fichier
                lesParcours = lesParcours.Replace("<p>parcoursListeLiens</p>", parcoursListeLiens);
                lesParcours = lesParcours.Replace("<p>parcoursListeNoms</p>", parcoursListeNoms);
                lesParcours = mff.traitementFile(lesParcours);
                System.IO.File.WriteAllText(destinationFile, lesParcours.ToString());

            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction de la liste des parcours");
                Console.WriteLine(err.Message);
            }
        }


        /// <summary>
        /// Cette fonction lit le fichier parcours.xml
        /// Elle construit l'ensemble des posters correspondant à 1 parcours
        /// </summary>
        /// <param name="ParcoursId">L'identifiant du parcours dont il faut lister les posters</param>
        public void constructPosters(String ParcoursId, String ParcoursName)
        {
            try
            {
                StringBuilder lesPosters = new StringBuilder();
                String PosterId = "";
                String PosterIdentifiant = "";

                string masterFileAllParcours = Globals.pathServer + "/_masters/unParcours.html";
                string destinationFile = Globals.pathClient + "/visite/p" + ParcoursId + "/index.html";

                lesPosters = mff.recopiage(masterFileAllParcours);
                lesPosters = mff.traitementFile(lesPosters);


                // Il faut sélectionner la liste des posters dans le fichier XML
                // et construire les phrases  parcoursListeLiens  et parcoursListeNoms sur la base des templates
                String fichierXML = Globals.pathServer + "/Parcours.xml";
                String postersListeLiens = "";
                String postersListeNoms = "";
                XmlDocument listeDesParcours = new XmlDocument();
                XmlDocument listeDesPosters = new XmlDocument();
                listeDesParcours.Load((fichierXML));
                listeDesPosters.Load((fichierXML));
                XmlNodeList nodes = listeDesParcours.SelectNodes("exposition/lesParcours/unParcours[@id=" + ParcoursId + "]/posters/poster");
                foreach (XmlNode node in nodes)
                {
                    // Pour connaitre le id (pas l'identifiant), il faut aller le chercher dans l'autre  bout du fichier XML                    
                    PosterIdentifiant = node.Attributes["id"].Value;
                    XmlNode nodePoster = listeDesPosters.SelectSingleNode("exposition/lesPosters/poster[identifiant='" + PosterIdentifiant + "']");
                    PosterId = nodePoster.Attributes["id"].Value;

                    // On crée un répertoire par poster
                    Directory.CreateDirectory(Globals.pathClient + "/visite/p" + ParcoursId + "/" + node.Attributes["id"].Value);

                    // Il faut créer les posters individuellement
                    constructUnPoster(ParcoursId, PosterId, PosterIdentifiant);



                    // On concatène les liens et les noms
                    postersListeLiens = postersListeLiens + mff.recopiage(Globals.pathServer + "/_includes/parcoursListeLiens.html");
                    postersListeNoms = postersListeNoms + mff.recopiage(Globals.pathServer + "/_includes/parcoursListeNoms.html");
                    // On introduit les paramètres de ce parcours
                    postersListeLiens = postersListeLiens.Replace("<p>hrefParcours</p>", node.Attributes["id"].Value);
                    postersListeNoms = postersListeNoms.Replace("<p>hrefParcours</p>", node.Attributes["id"].Value);
                    postersListeLiens = postersListeLiens.Replace("<p>numParcours</p>", PosterId);
                    postersListeNoms = postersListeNoms.Replace("<p>numParcours</p>", PosterId);
                    postersListeLiens = postersListeLiens.Replace("<p>nomParcours</p>", node.Attributes["id"].Value);
                    postersListeNoms = postersListeNoms.Replace("<p>nomParcours</p>", nodePoster.SelectSingleNode("nom").InnerText);
                    var ImageFiles = Directory.GetFiles(Globals.pathServer + "/posters/" + PosterIdentifiant + "/_assets");
                    foreach (var f in ImageFiles)
                    {
                        if (f.EndsWith("jpg") || f.EndsWith("png"))
                        {
                            postersListeLiens = postersListeLiens.Replace("<p>imageParcours</p>", "/visite/assets/" + mff.extractName(f));
                        }
                    }
                }

                // On met à jour les textes à insérer dans le fichier
                lesPosters = lesPosters.Replace("<p>postersListeLiens</p>", postersListeLiens);
                lesPosters = lesPosters.Replace("<p>postersListeNom</p>", postersListeNoms);
                lesPosters = mff.traitementFile(lesPosters);
                lesPosters = lesPosters.Replace("<p>numParcours</p>", ParcoursId);
                lesPosters = lesPosters.Replace("<p>nomParcours</p>", ParcoursName);
                System.IO.File.WriteAllText(destinationFile, lesPosters.ToString());

            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction de la liste des posters");
                Console.WriteLine(err.Message.ToString());
            }
        }

        /// <summary>
        /// Cette fonction lit le fichier parcours.xml
        /// Elle construit 1 poster correspondant à 1 parcours
        /// Si un même poster se trouve dans plusieurs parcours, il faaut le construire plusieurs fois
        /// (pour la navigation)
        /// Pas optimal mais on changera après
        /// </summary>
        /// <param name="ParcoursId">L'identifiant du parcours dont il faut lister les posters</param>
        /// <param name="posterID">L'identifiant du poster (un chiffre)</param>
        /// <param name="posterIdentifiant">L'identifiant du poster (un nom)</param>
        public void constructUnPoster(String ParcoursId, String posterID, String posterIdentifiant)
        {
            try
            {
                StringBuilder unPoster = new StringBuilder();
                int PosterNum = int.Parse(posterID);
                String parametres = "";

                string masterFileAllParcours = Globals.pathServer + "/_masters/unPoster.html";
                string destinationFile = Globals.pathClient + "/visite/p" + ParcoursId + "/" + posterIdentifiant + "/index.html";
                unPoster = mff.recopiage(masterFileAllParcours);
                unPoster = mff.traitementFile(unPoster);

                // Il faut sélectionner la liste des posters dans le fichier XML
                // et construire les phrases  parcoursListeLiens  et parcoursListeNoms sur la base des templates
                String fichierXML = Globals.pathServer + "/Parcours.xml";

                XmlDocument listeDesParcours = new XmlDocument();
                XmlDocument listeDesPosters = new XmlDocument();
                listeDesParcours.Load((fichierXML));
                listeDesPosters.Load((fichierXML));
                XmlNodeList nodes = listeDesParcours.SelectNodes("exposition/lesParcours/unParcours[@id=" + ParcoursId + "]/posters/poster");
                foreach (XmlNode node in nodes)
                {
                    // On parcourt la liste des noeuds et on regarde si l'identifiant 
                    // de ce poster correspond à celui passé en paramètre
                    if (node.Attributes["id"].Value == posterIdentifiant)
                    {
                        XmlNode nodePoster = listeDesPosters.SelectSingleNode("exposition/lesPosters/poster[identifiant='" + posterIdentifiant + "']");

                        // Paramètres à passer à la construction du poster
                        parametres = "<param><origine>poster</origine><ParcoursId>" + ParcoursId + "</ParcoursId><posterIdentifiant>" + posterIdentifiant + "</posterIdentifiant></param>";
                        XmlDocument paramsDoc = new XmlDocument();
                        paramsDoc.LoadXml(parametres);
                        XmlNode paramsNode = paramsDoc.SelectSingleNode("param");
                        unPoster = myPosterFromPoster(paramsNode, unPoster, node);

                        System.IO.File.WriteAllText(destinationFile, unPoster.ToString());
                    }
                }

            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction d'un poster");
                Console.WriteLine(err.Message);
            }
        }

        /// <summary>
        /// Cette fonction lit le fichier parcours.xml
        /// Elle construit tous les posters de manière à pouvoir y accéder par QRCode
        /// Si un même poster se trouve dans plusieurs parcours, il faut afficher la liste des parcours correspondants
        /// </summary>
        public void constructPosterIsole()
        {
            try
            {
                StringBuilder unPoster = new StringBuilder();
                String parametres = "";
                String posterIdentifiant = "";
                string destinationFile = "";
                String posterQrCode = "";
                string masterFileAllParcours = Globals.pathServer + "/_masters/unPoster.html";
                XmlDocument listeDesPosters = new XmlDocument();
                String fichierXML = Globals.pathServer + "/Parcours.xml";
                listeDesPosters.Load((fichierXML));
                XmlNodeList nodes = listeDesPosters.SelectNodes("exposition/lesPosters/poster");

                // On crée un répertoire pour les posters isolés
                Directory.CreateDirectory(Globals.pathClient + "/visite/posters");

                // On parcourt tous les noeuds
                foreach (XmlNode node in nodes)
                {
                    // On extrait le QRCode et l'identifiant du poster
                    posterQrCode = node.SelectSingleNode("qrcode").InnerText;
                    posterIdentifiant = node.SelectSingleNode("identifiant").InnerText;

                    Directory.CreateDirectory(Globals.pathClient + "/visite/posters/" + posterQrCode);
                    destinationFile = Globals.pathClient + "/visite/posters/" + posterQrCode + "/index.html";
                    unPoster = mff.recopiage(masterFileAllParcours);
                    unPoster = mff.traitementFile(unPoster);

                    // Paramètres à passer à la construction du poster
                    parametres = "<param><origine>qrcode</origine><posterQrCode>" + posterQrCode + "</posterQrCode><posterIdentifiant>" + posterIdentifiant + "</posterIdentifiant></param>";
                    XmlDocument paramsDoc = new XmlDocument();
                    paramsDoc.LoadXml(parametres);
                    XmlNode paramsNode = paramsDoc.SelectSingleNode("param");

                    // On appelle la construction du poster
                    unPoster = myPosterFromQrCode(paramsNode, unPoster, node);

                    // On sauvegarde le poster dans un fichier
                    System.IO.File.WriteAllText(destinationFile, unPoster.ToString());
                }

            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction d'un poster");
                Console.WriteLine(err.Message);
            }
        }


        /// <summary>
        /// Cette fonction construit 1 poster correspondant à 1 identifiant
        /// </summary>
        /// <param name="comeFrom">un noeud XML avec toute une série d'info comme l'identifiant du poster, le parcours</param>
        /// <param name="unPoster">Le template du poster</param>
        /// <param name="node">un noeud XML avec les données extraites du parcours</param>
        public StringBuilder myPosterFromPoster(XmlNode comeFrom, StringBuilder unPoster, XmlNode node)
        {
            String posterIdentifiant = comeFrom.SelectSingleNode("posterIdentifiant").InnerText;
            String parcoursId = comeFrom.SelectSingleNode("ParcoursId").InnerText;
            String LesImages = "";
            String LesTextes = "";
            String href = "";
            String laNavigation = "";
            String vignettes = "";
            String idVignette = "";
            String backImagePath = "";
            String LeNomDuPoster = "";

            try
            {
                LeNomDuPoster = node.ParentNode.ParentNode.SelectSingleNode("nom").InnerText;
                while (unPoster.ToString().Contains("<p>nomPoster</p>"))
                {
                    unPoster.Replace("<p>nomPoster</p>", LeNomDuPoster);
                }

                // Traitement des images
                LesImages = mff.traitementImages(posterIdentifiant, " / visite/p" + parcoursId + "/" + posterIdentifiant);
                if (unPoster.ToString().Contains("<p>blocPosterPhoto</p>"))
                {
                    unPoster = unPoster.Replace("<p>blocPosterPhoto</p>", LesImages);
                }
                unPoster = unPoster.Replace("<p>blocPosterPhoto</p>", "");
                // Traitement des videos
                LesImages = mff.traitementVideos(posterIdentifiant, "/visite/p" + parcoursId + "/" + posterIdentifiant);
                if (unPoster.ToString().Contains("<p>videoContent</p>"))
                {
                    unPoster = unPoster.Replace("<p>videoContent</p>", LesImages);
                }

                // Traitement des textes
                LesTextes = mff.traitementTextes(posterIdentifiant);
                if (unPoster.ToString().Contains("<p>blocPosterTexte</p>"))
                {
                    unPoster = unPoster.Replace("<p>blocPosterTexte</p>", LesTextes);
                }



                // Traitement des vignettes supérieures
                if (node.PreviousSibling != null)
                {
                    if (node.PreviousSibling.PreviousSibling != null)
                    {
                        idVignette = node.PreviousSibling.PreviousSibling.Attributes["id"].Value;
                        href = "/visite/p" + parcoursId + "/" + idVignette;
                        backImagePath = "/visite/p" + parcoursId + "/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }
                if (node.PreviousSibling != null)
                {
                    idVignette = node.PreviousSibling.Attributes["id"].Value;
                    href = "/visite/p" + parcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + parcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node != null)
                {
                    idVignette = node.Attributes["id"].Value;
                    href = "/visite/p" + parcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + parcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node.NextSibling != null)
                {
                    idVignette = node.NextSibling.Attributes["id"].Value;
                    href = "/visite/p" + parcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + parcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node.NextSibling != null)
                {
                    if (node.NextSibling.NextSibling != null)
                    {
                        idVignette = node.NextSibling.NextSibling.Attributes["id"].Value;
                        href = "/visite/p" + parcoursId + "/" + idVignette;
                        backImagePath = "/visite/p" + parcoursId + "/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }
                if (unPoster.ToString().Contains("<p>vignettesSuperieures</p>"))
                {
                    unPoster = unPoster.Replace("<p>vignettesSuperieures</p>", vignettes);
                }


                // ********************  LA  NAVIGATION
                // Il faut savoir s'il y a un poster suivant ou précédent
                laNavigation = "";
                if (node.NextSibling != null)
                {
                    // Si nextPoster existe, il faut aller cherche, le numéro et construire le lien
                    href = "/visite/p" + parcoursId + "/" + node.NextSibling.Attributes["id"].Value;
                    laNavigation = laNavigation + mff.recopiage(Globals.pathServer + "/_includes/nextPoster.html");
                    while (laNavigation.ToString().Contains("<p>hrefNext</p>"))
                    {
                        laNavigation = laNavigation.Replace("<p>hrefNext</p>", href);
                    }
                    while (laNavigation.ToString().Contains("<p>numNext</p>"))
                    {
                        laNavigation = laNavigation.Replace("<p>numNext</p>", node.NextSibling.Attributes["id"].Value);
                    }
                }
                while (unPoster.ToString().Contains("<p>nextPoster</p>"))
                {
                    unPoster = unPoster.Replace("<p>nextPoster</p>", laNavigation);
                }

                laNavigation = "";
                if (node.PreviousSibling != null)
                {
                    // Si previousPoster existe, il faut aller cherche, le numéro et construire le lien
                    href = "/visite/p" + parcoursId + "/" + node.PreviousSibling.Attributes["id"].Value;
                    laNavigation = laNavigation + mff.recopiage(Globals.pathServer + "/_includes/previousPoster.html");
                    while (laNavigation.ToString().Contains("<p>hrefPrevious</p>"))
                    {
                        laNavigation = laNavigation.Replace("<p>hrefPrevious</p>", href);
                    }
                    while (laNavigation.ToString().Contains("<p>numPrevious</p>"))
                    {
                        laNavigation = laNavigation.Replace("<p>numPrevious</p>", node.PreviousSibling.Attributes["id"].Value);
                    }
                }
                while (unPoster.ToString().Contains("<p>previousPoster</p>"))
                {
                    unPoster = unPoster.Replace("<p>previousPoster</p>", laNavigation);
                }


                return unPoster;
            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction d'un poster");
                Console.WriteLine(err.Message);
                return unPoster;
            }
        }


        /// <summary>
        /// Cette fonction construit 1 poster correspondant à 1 QrCode
        /// </summary>
        /// <param name="comeFrom">un noeud XML avec toute une série d'info comme l'identifiant du poster et son QrCode</param>
        /// <param name="unPoster">Le template du poster</param>
        /// <param name="node">un noeud XML avec les données extraites du parcours</param>
        public StringBuilder myPosterFromQrCode(XmlNode comeFrom, StringBuilder unPoster, XmlNode node)
        {
            String posterIdentifiant = comeFrom.SelectSingleNode("posterIdentifiant").InnerText;
            String posterQrCode = comeFrom.SelectSingleNode("posterQrCode").InnerText;
            String LesImages = "";
            String LesTextes = "";
            String href = "";
            String vignettes = "";
            String idVignette = "";
            String backImagePath = "";
            String LeNomDuPoster = "";

            try
            {
                LeNomDuPoster = node.SelectSingleNode("nom").InnerText;
                while (unPoster.ToString().Contains("<p>nomPoster</p>"))
                {
                    unPoster.Replace("<p>nomPoster</p>", LeNomDuPoster);
                }

                // Traitement des images
                LesImages = mff.traitementImages(posterIdentifiant, "/visite/posters/" + posterQrCode);
                if (unPoster.ToString().Contains("<p>blocPosterPhoto</p>"))
                {
                    unPoster = unPoster.Replace("<p>blocPosterPhoto</p>", LesImages);
                }
                unPoster = unPoster.Replace("<p>blocPosterPhoto</p>", "");
                // Traitement des videos
                LesImages = mff.traitementVideos(posterIdentifiant, "/visite/posters/" + posterQrCode);
                if (unPoster.ToString().Contains("<p>videoContent</p>"))
                {
                    unPoster = unPoster.Replace("<p>videoContent</p>", LesImages);
                }

                // Traitement des textes
                LesTextes = mff.traitementTextes(posterIdentifiant);
                if (unPoster.ToString().Contains("<p>blocPosterTexte</p>"))
                {
                    unPoster = unPoster.Replace("<p>blocPosterTexte</p>", LesTextes);
                }


                // Traitement des vignettes supérieures
                if (node.PreviousSibling != null)
                {
                    if (node.PreviousSibling.PreviousSibling != null)
                    {
                        idVignette = node.PreviousSibling.PreviousSibling.SelectSingleNode("identifiant").InnerText;
                        posterQrCode = node.PreviousSibling.PreviousSibling.SelectSingleNode("qrcode").InnerText;
                        href = "/visite/posters/" + posterQrCode;
                        backImagePath = "/visite/posters/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }
                if (node.PreviousSibling != null)
                {
                    idVignette = node.PreviousSibling.SelectSingleNode("identifiant").InnerText;
                    posterQrCode = node.PreviousSibling.SelectSingleNode("qrcode").InnerText;
                    href = "/visite/posters/" + posterQrCode;
                    backImagePath = "/visite/posters/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node != null)
                {
                    idVignette = node.SelectSingleNode("identifiant").InnerText;
                    posterQrCode = node.SelectSingleNode("qrcode").InnerText;
                    href = "/visite/posters/" + posterQrCode;
                    backImagePath = "/visite/posters/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node.NextSibling != null)
                {
                    idVignette = node.NextSibling.SelectSingleNode("identifiant").InnerText;
                    posterQrCode = node.NextSibling.SelectSingleNode("qrcode").InnerText;
                    href = "/visite/posters/" + posterQrCode;
                    backImagePath = "/visite/posters/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }
                if (node.NextSibling != null)
                {
                    if (node.NextSibling.NextSibling != null)
                    {
                        posterQrCode = node.NextSibling.NextSibling.SelectSingleNode("qrcode").InnerText;
                        idVignette = node.NextSibling.NextSibling.SelectSingleNode("identifiant").InnerText;
                        href = "/visite/posters/" + posterQrCode;
                        backImagePath = "/visite/posters/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }
                if (unPoster.ToString().Contains("<p>vignettesSuperieures</p>"))
                {
                    unPoster = unPoster.Replace("<p>vignettesSuperieures</p>", vignettes);
                }

                return unPoster;
            }
            catch (Exception err)
            {
                Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction d'un poster");
                Console.WriteLine(err.Message);
                return unPoster;
            }
        }
    }
}
