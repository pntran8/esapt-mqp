import { PrismaClient } from "../.prisma/client";
const client = new PrismaClient();

async function main() {
    const accounts = await client.accounts.createMany({
        data: [
            {
                userID: "0B9C8F57",
                imageFile: "file.png",
                timeCreated: new Date()
            },
            {
                userID: "0B9C8F57",
                imageFile: "testing.png",
                timeCreated: new Date()
            },
            {
                userID: "0B9C8F57",
                imageFile: "hello.png",
                timeCreated: new Date()
            },
            {
                userID: "0B9C8F57",
                imageFile: "intak.png",
                timeCreated: new Date()
            },
            {
                userID: "0B9C8F57",
                imageFile: "soobin.png",
                timeCreated: new Date()
            },
        ]
    })
}

main()
    .then(() => console.log("dis works"))
    .catch(e => {
        console.error(e.message);
    })
    .finally(async () => {
        await client.$disconnect();
    });

