using System;
using System.Configuration;
using System.IO;

namespace ConsoleApp1
{
    class Program
    {
        static void Main(string[] args)
        {
            // Initialisation des répertoires serveurs et clients pour la suite
            string pathServer = ConfigurationSettings.AppSettings["siteServeurFolder"];
            string pathClient = ConfigurationSettings.AppSettings["siteClientFolder"];
            generationPages gp = new generationPages();
            gp.initialisation(pathServer, pathClient);

            // On efface tout le répertoire visite et les sous-répertoires
               String visiteFolder = pathClient + "/visite";
            try
            {
                Directory.Delete(visiteFolder, true);
                Console.WriteLine("Le répertoire de destination a été effacé !");
            } catch (Exception e) { }
            Directory.CreateDirectory(visiteFolder);
            Directory.CreateDirectory(visiteFolder +"/assets");
            Console.WriteLine("Le répertoire de destination a été recrée !");  
            
            // On génère la page d'acceuil
            Console.WriteLine("Génération de la page d'accueil");
            gp.constructAccueil();
            Console.WriteLine("La page d'accueil a été recrée !");

            // On génère la page scannant les qrCodes
            Console.WriteLine("Génération de la page ddes QRCodes");
            gp.constructPageQRCode();
            Console.WriteLine("La page d'accueil a été recrée !");


            // On génère les parcours
            Console.WriteLine("Génération des pages des parcours");
            try {
                gp.constructParcours();
                Console.WriteLine("Les pages de la construction des parcours ont été bien générées !");
            }
            catch (Exception e)
            {
                Console.WriteLine("ATTENTION : " + e.Message);
            }


            // On génère les posters isolés (pour les QRCodes)
            Console.WriteLine("Génération des posters isolés");
            try
            {
                gp.constructPosterIsole();
                Console.WriteLine("Les pages de la construction des parcours ont été bien générées !");
            }
            catch (Exception e)
            {
                Console.WriteLine("ATTENTION : " + e.Message);
            }
            Console.Read();

        }


    }




}
