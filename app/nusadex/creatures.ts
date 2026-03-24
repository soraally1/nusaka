export interface Creature {
    id: number;
    name: string;
    type: string;
    element: "Tanah" | "Angin" | "Air";
    description: string;
    modelUrl: string;
    accent: string;
    habitat: string;
    status: string;
    level: number;
    exp: number;
    // Visual tweaks
    scale?: number;
    position?: [number, number, number];
    rotationOffset?: number;  // radians, applied on top of default facing angle
}

export const NUSA_CREATURES: Creature[] = [
    {
        id: 1,
        name: "Elang Jawa",
        type: "Sky",
        element: "Angin",
        description:
            "Burung nasional Indonesia yang menjadi inspirasi lambang negara Garuda. Menghuni puncak pegunungan Pulau Jawa, burung ini sangat langka dan menjadi simbol kegagahan nusantara.",
        modelUrl: "/model/rajawali.glb",
        accent: "text-yellow-600",
        habitat: "Puncak Gunung",
        status: "Legenda",
        level: 24,
        exp: 45,
        scale: 2,
        position: [0, 2, 2],
    },
    {
        id: 2,
        name: "Komodo",
        type: "Dragon",
        element: "Tanah",
        description:
            "Kadal purba terbesar di dunia yang merupakan satwa endemik Pulau Komodo. Memiliki habitat di padang rumput dan hutan gersang, kadal ini adalah predator puncak yang dilindungi secara global.",
        modelUrl: "/model/Komodo.glb",
        accent: "text-orange-600",
        habitat: "Pulau Gersang",
        status: "Dilindungi",
        level: 32,
        exp: 80,
        scale: 1,
        position: [0, 3, 0],
    },
    {
        id: 3,
        name: "OrangUtan",
        type: "Beast",
        element: "Tanah",
        description:
            "Salah satu kera besar paling cerdas yang berasal dari hutan hujan Kalimantan. Dikenal sebagai 'Penjaga Hutan', mereka berperan penting dalam regenerasi ekosistem hutan melalui penyebaran biji buah.",
        modelUrl: "/model/OrangUtan.glb",
        accent: "text-red-700",
        habitat: "Hutan Rimba",
        status: "Langka",
        level: 15,
        exp: 65,
        scale: 1.5,
        position: [0, 2, 0],
    },
    {
        id: 4,
        name: "Badak Sumatera",
        type: "Beast",
        element: "Tanah",
        description:
            "Badak terkecil di dunia dan satu-satunya badak Asia yang memiliki dua cula. Merupakan simbol ketangguhan hutan hujan Sumatera yang kini statusnya sangat kritis dan dilindungi dengan ketat.",
        modelUrl: "/model/badag.glb",
        accent: "text-slate-800",
        habitat: "Hutan Hujan",
        status: "Sangat Kritis",
        level: 28,
        exp: 75,
        scale: 1.2,
        position: [0, 1.5, 0],
    },
    {
        id: 5,
        name: "Harimau Sumatera",
        type: "Beast",
        element: "Tanah",
        description:
            "Satu-satunya subspesies harimau yang masih tersisa di Indonesia. Predator puncak yang menghuni hutan lebat Sumatera. Dikenal dengan belangnya yang rapat dan ukurannya yang lebih kecil namun tak kalah ganas.",
        modelUrl: "/model/HarimauSumatera.glb",
        accent: "text-orange-600",
        habitat: "Hutan Sumatera",
        status: "Sangat Kritis",
        level: 40,
        exp: 90,
        scale: 3.5,
        position: [0, 1.5, 0],
        rotationOffset: 75 * (Math.PI / 180),  // Menghadap diagonal ke kanan bawah
    },
];
