public void constructPosterIsole()
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











        XmlDocument listeDesPosters = new XmlDocument();
        String fichierXML = Globals.pathServer + "/Parcours.xml";
        listeDesPosters.Load((fichierXML));
        XmlNodeList nodes = listeDesPosters.SelectNodes("exposition/lesPosters/poster");

        // On crée un répertoire pour les posters isolés
        Directory.CreateDirectory(Globals.pathClient + "/visite/posters");

        foreach (XmlNode node in nodes)
        {
            posterQrCode = node.SelectSingleNode("qrcode").InnerText;
            posterIdentifiant = node.SelectSingleNode("identifiant").InnerText;

            Directory.CreateDirectory(Globals.pathClient + "/visite/posters/" + posterQrCode);
            destinationFile = Globals.pathClient + "/visite/posters/" + posterQrCode + "/index.html";

            //Directory.CreateDirectory(Globals.pathClient + "/visite/posters/" + posterIdentifiant);
            //destinationFile = Globals.pathClient + "/visite/posters/" + posterIdentifiant + "/index.html";

            unPoster = mff.recopiage(masterFileAllParcours);
            unPoster = mff.traitementFile(unPoster);


            while (unPoster.ToString().Contains("<p>nomLatin</p>"))
            {
                unPoster.Replace("<p>nomLatin</p>", LeNomLatin);
            }
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
            String href = "";
            String laNavigation = "";
            String vignettes = "";
            String idVignette = "";
            String backImagePath = "";




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



            System.IO.File.WriteAllText(destinationFile, unPoster.ToString());
        }

    }

















































    catch (Exception err)
    {
        Console.WriteLine("ATTENTION : une erreur s'est produite dans la construction d'un poster");
        Console.WriteLine(err.Message);
    }
}
