public void constructUnPoster(String ParcoursId, String posterID, String posterIdentifiant)
{
    try
    {
        StringBuilder unPoster = new StringBuilder();
        String LeNomLatin = "";
        String LeNomDuPoster = "";
        String LesTextes = "";
        String LesImages = "";
        String posterIdentifiant = "";
        string destinationFile = "";
        String posterQrCode = "";

        String href = "";
        String laNavigation = "";




        string masterFileAllParcours = Globals.pathServer + "/_masters/unPoster.html";
        destinationFile = Globals.pathClient + "/visite/p" + ParcoursId + "/" + posterIdentifiant + "/index.html";
        unPoster = mff.recopiage(masterFileAllParcours);
        unPoster = mff.traitementFile(unPoster);
        int PosterNum = int.Parse(posterID);

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
                //LeNomLatin = nodePoster.SelectSingleNode("nomLatin").InnerText;
                //while (unPoster.ToString().Contains("<p>nomLatin</p>"))
                //{
                //    unPoster.Replace("<p>nomLatin</p>", LeNomLatin);
                //}
                LeNomDuPoster = node.ParentNode.ParentNode.SelectSingleNode("nom").InnerText;
                //nodePoster.SelectSingleNode("nom").InnerText;
                while (unPoster.ToString().Contains("<p>nomPoster</p>"))
                {
                    unPoster.Replace("<p>nomPoster</p>", LeNomDuPoster);
                }

                
                
                
                
                
                
                
                
                
                
                
                // Traitement des images
                LesImages = mff.traitementImages(posterIdentifiant, "/visite/p" + ParcoursId + "/" + posterIdentifiant);
                if (unPoster.ToString().Contains("<p>blocPosterPhoto</p>"))
                {
                    unPoster = unPoster.Replace("<p>blocPosterPhoto</p>", LesImages);
                }

                // Traitement des videos
                LesImages = mff.traitementVideos(posterIdentifiant, "/visite/p" + ParcoursId + "/" + posterIdentifiant);
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
                href = "";
                laNavigation = "";
                String vignettes = "";
                String idVignette = "";
                String backImagePath = "";




                if (node.PreviousSibling != null)
                {
                    if (node.PreviousSibling.PreviousSibling != null)
                    {
                        idVignette = node.PreviousSibling.PreviousSibling.Attributes["id"].Value;
                        href = "/visite/p" + ParcoursId + "/" + idVignette;
                        backImagePath = "/visite/p" + ParcoursId + "/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }



                if (node.PreviousSibling != null)
                {
                    idVignette = node.PreviousSibling.Attributes["id"].Value;
                    href = "/visite/p" + ParcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + ParcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }

                
                if (node != null)
                {
                    idVignette = node.Attributes["id"].Value;
                    href = "/visite/p" + ParcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + ParcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }



                if (node.NextSibling != null)
                {
                    idVignette = node.NextSibling.Attributes["id"].Value;
                    href = "/visite/p" + ParcoursId + "/" + idVignette;
                    backImagePath = "/visite/p" + ParcoursId + "/" + idVignette;
                    vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);

                }



                if (node.NextSibling != null)
                {
                    if (node.NextSibling.NextSibling != null)
                    {
                        idVignette = node.NextSibling.NextSibling.Attributes["id"].Value;
                        href = "/visite/p" + ParcoursId + "/" + idVignette;
                        backImagePath = "/visite/p" + ParcoursId + "/" + idVignette;
                        vignettes = vignettes + mff.traitementVignettes(idVignette, href, backImagePath);
                    }
                }





                if (unPoster.ToString().Contains("<p>vignettesSuperieures</p>"))
                {
                    unPoster = unPoster.Replace("<p>vignettesSuperieures</p>", vignettes);
                }







                href = "";
                laNavigation = "";
                // ********************  LA  NAVIGATION
                // Il faut savoir s'il y a un poster suivant ou précédent
                if (node.NextSibling != null)
                {
                    // Si nextPoster existe, il faut aller cherche, le numéro et construire le lien
                    href = "/visite/p" + ParcoursId + "/" + node.NextSibling.Attributes["id"].Value;
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
                    href = "/visite/p" + ParcoursId + "/" + node.PreviousSibling.Attributes["id"].Value;
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
