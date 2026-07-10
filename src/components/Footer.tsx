const Footer = () => {
  return (
    <footer className="bg-foreground text-background/70 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="text-background font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">About us</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">Help center</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Partner with us</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Ride with us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">Terms & conditions</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Privacy policy</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Cookie policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-bold mb-4">Follow us</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/10 pt-6 text-center text-sm">
          <p>© 2026 EasyLife. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
