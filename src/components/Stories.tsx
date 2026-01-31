'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Story {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
}

interface StoriesProps {
  stories: Story[];
}

export default function Stories({ stories }: StoriesProps) {
  return (
    <div className="bg-black border border-neutral-800 rounded-lg p-4 mb-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {stories.map((story) => (
          <Link 
            key={story.id} 
            href={`/agent/${story.username}`}
            className="flex flex-col items-center gap-1 min-w-[66px]"
          >
            <div className={`w-16 h-16 rounded-full p-[2px] ${
              story.hasStory 
                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' 
                : 'bg-neutral-700'
            }`}>
              <div className="w-full h-full rounded-full bg-black p-[2px]">
                <Image
                  src={story.avatar}
                  alt={story.username}
                  width={60}
                  height={60}
                  className="rounded-full object-cover w-full h-full"
                  unoptimized
                />
              </div>
            </div>
            <span className="text-xs text-white truncate w-16 text-center">
              {story.username.length > 10 ? story.username.slice(0, 9) + '...' : story.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
