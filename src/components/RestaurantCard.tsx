import { Star, Clock, Tag } from "lucide-react";

interface RestaurantCardProps {
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  cuisines: string[];
  discount?: string;
}

const RestaurantCard = ({ name, image, rating, deliveryTime, cuisines, discount }: RestaurantCardProps) => {
  return (
    <div className="group bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {discount}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-foreground text-base mb-2 group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center gap-1 bg-success/10 text-success text-xs font-bold px-2 py-1 rounded-md">
            <Star className="w-3 h-3 fill-current" />
            {rating}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            {deliveryTime}
          </span>
        </div>
        <p className="text-muted-foreground text-xs truncate">{cuisines.join(" · ")}</p>
      </div>
    </div>
  );
};

export default RestaurantCard;
