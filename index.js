const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('DMAll Bot Operational!\n');
}).listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

const OWNER_ID = '1166445202148442112'; // Ton ID exclusif (77jc)

client.on('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt.`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // Commande !dmall (Strictement réservée à ton ID)
    if (message.content.startsWith(`!dmall`)) {
        if (message.author.id !== OWNER_ID) {
            return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
        }

        await message.reply("💬 **[DMAll Sécurisé]** Envoie dans ce salon le message que tu souhaites diffuser (variables: `{mention}`, `{name}`). \n💡 *Tape simplement **annuler** pour stopper.*");

        const filter = m => m.author.id === OWNER_ID;
        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async m => {
            // Si tu tapes "annuler", on arrête tout tout de suite
            if (m.content.toLowerCase() === 'annuler') {
                return message.channel.send("❌ **Opération DMAll annulée.**");
            }

            const messageTemplate = m.content;

            const previewEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Confirmation requise - DMAll')
                .setDescription(`Voici le message qui va être diffusé :\n\n\`\`\`${messageTemplate}\`\`\``)
                .setFooter({ text: `Demandé par ${message.author.tag}` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_dmall')
                        .setLabel('Confirmer l\'envoi')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel_dmall')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Danger)
                );

            const confirmMsg = await message.channel.send({ embeds: [previewEmbed], components: [row] });

            const buttonFilter = i => i.user.id === OWNER_ID;
            const buttonCollector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

            buttonCollector.on('collect', async interaction => {
                if (interaction.customId === 'cancel_dmall') {
                    await interaction.update({ content: "❌ **Diffusion DMAll annulée.**", embeds: [], components: [] });
                    return;
                }

                if (interaction.customId === 'confirm_dmall') {
                    await interaction.update({ content: "🚀 **Diffusion DMAll lancée en temps réel !**", embeds: [], components: [] });

                    const initialEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🚀 Diffusion en cours...')
                        .addFields(
                            { name: '👥 Total', value: 'Calcul...', inline: true },
                            { name: '✅ Envoyés', value: '0', inline: true },
                            { name: '❌ Erreurs', value: '0', inline: true },
                            { name: '📊 Progression', value: '0%', inline: true }
                        );

                    const statusMsg = await message.channel.send({ embeds: [initialEmbed] });

                    try {
                        await message.guild.members.fetch();
                        const members = message.guild.members.cache.filter(member => !member.user.bot);
                        const totalMembers = members.size;

                        let successCount = 0;
                        let failCount = 0;
                        let processed = 0;

                        for (const [id, member] of members) {
                            try {
                                const finalMessage = messageTemplate
                                    .replace(/\{mention\}/g, `<@${member.id}>`)
                                    .replace(/\{name\}/g, member.user.username);

                                await member.send(finalMessage);
                                successCount++;
                            } catch (err) {
                                failCount++;
                            }

                            processed++;
                            const percent = Math.round((processed / totalMembers) * 100);

                            if (processed % 5 === 0 || processed === totalMembers) {
                                const updateEmbed = new EmbedBuilder()
                                    .setColor('#5865F2')
                                    .setTitle('🚀 Diffusion en cours...')
                                    .addFields(
                                        { name: '👥 Total cibles', value: `${totalMembers}`, inline: true },
                                        { name: '✅ Envoyés', value: `${successCount}`, inline: true },
                                        { name: '❌ Échecs (MPs fermés)', value: `${failCount}`, inline: true },
                                        { name: '📊 Progression', value: `${percent}% (${processed}/${totalMembers})`, inline: false }
                                    );

                                await statusMsg.edit({ embeds: [updateEmbed] }).catch(() => {});
                            }

                            await new Promise(resolve => setTimeout(resolve, 1000)); // Anti-rate limit 1s
                        }

                        const finalEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Diffusion DMAll Terminée !')
                            .addFields(
                                { name: '👥 Total', value: `${totalMembers}`, inline: true },
                                { name: '✅ Succès', value: `${successCount}`, inline: true },
                                { name: '❌ Échecs', value: `${failCount}`, inline: true }
                            );

                        await statusMsg.edit({ embeds: [finalEmbed] });

                    } catch (error) {
                        console.error(error);
                        message.channel.send("❌ Erreur critique lors de la récupération des membres.");
                    }
                }
            });
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
