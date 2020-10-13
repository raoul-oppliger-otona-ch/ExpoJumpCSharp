using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleApp1.code
{
    public class Arbre : IEquatable<Arbre>
    {


        public string FolderName { get; set; }
        public string FolderPath { get; set; }

        public int FolderId { get; set; }

        public override string ToString()
        {
            return "ID: " + FolderId + "   Name: " + FolderName;
        }
        public override bool Equals(object obj)
        {
            if (obj == null) return false;
            Arbre objAsPart = obj as Arbre;
            if (objAsPart == null) return false;
            else return Equals(objAsPart);
        }
        public override int GetHashCode()
        {
            return FolderId;
        }
        public bool Equals(Arbre other)
        {
            if (other == null) return false;
            return (this.FolderId.Equals(other.FolderId));
        }
    }

}
